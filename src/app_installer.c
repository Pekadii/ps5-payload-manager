/*
 * PS5 App Installer for Payload Manager
 * Based on the original implementation in ftpsrv by John Törnblom.
 */

#include <errno.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>

#include "app_installer.h"
#include "pldmgr.h"
#include <ps5/kernel.h>

#define INCASSET(name, file)                                                   \
  __asm__(".section .rodata\n"                                                 \
          ".global " #name "\n"                                                \
          ".global " #name "_end\n"                                            \
          ".global " #name "_size\n"                                           \
          ".align 16\n" #name ":\n"                                            \
          ".incbin \"" file "\"\n" #name "_end:\n" #name "_size:\n"            \
          ".quad " #name "_end - " #name "\n"                                  \
          ".previous\n");                                                      \
  extern const uint8_t name[];                                                 \
  extern const size_t name##_size;

INCASSET(param_json, "assets/param.json");
INCASSET(icon0_png, "assets/icon0.png");

int sceAppInstUtilInitialize(void);
int sceAppInstUtilTerminate(void);
int sceAppInstUtilAppInstallAll(void *);
int sceAppInstUtilAppUnInstall(const char *);

static int install_file(const char *path, const uint8_t *data, size_t size) {
  FILE *f;
  if (!(f = fopen(path, "w"))) {
    return -1;
  }
  if (fwrite(data, size, 1, f) != 1) {
    fclose(f);
    return -1;
  }
  fclose(f);
  return 0;
}

static int install_app(const char *title_id, const char *dir) {
  int (*sceAppInstUtilAppInstallTitleDir)(const char *, const char *, void *) =
      0;
  const char *nid = "Wudg3Xe3heE";
  uint32_t handle;

  if (!kernel_dynlib_handle(-1, "libSceAppInstUtil.sprx", &handle)) {
    sceAppInstUtilAppInstallTitleDir =
        (void *)kernel_dynlib_resolve(-1, handle, nid);
  }

  if (sceAppInstUtilAppInstallTitleDir) {
    return sceAppInstUtilAppInstallTitleDir(title_id, dir, 0);
  }

  return sceAppInstUtilAppInstallAll(0);
}

static int needs_update(const char *path, const uint8_t *expected_data,
                        size_t expected_size) {
  struct stat st;
  if (stat(path, &st) != 0)
    return 1;
  if (st.st_size != expected_size)
    return 1;

  FILE *f = fopen(path, "r");
  if (!f)
    return 1;

  uint8_t *buf = malloc(expected_size);
  if (!buf) {
    fclose(f);
    return 1;
  }

  if (fread(buf, 1, expected_size, f) != expected_size) {
    free(buf);
    fclose(f);
    return 1;
  }
  fclose(f);

  int mismatch = memcmp(buf, expected_data, expected_size);
  free(buf);

  return mismatch != 0;
}


static const char *launcher_status_name(PldmgrLauncherStatus status) {
  switch (status) {
  case PLDMGR_LAUNCHER_MISSING: return "missing";
  case PLDMGR_LAUNCHER_FILES_INCOMPLETE: return "incomplete";
  case PLDMGR_LAUNCHER_FILES_OUTDATED: return "outdated";
  case PLDMGR_LAUNCHER_FILES_READY: return "ready";
  default: return "unknown";
  }
}

PldmgrLauncherStatus pldmgr_get_app_status(void) {
  struct stat st;
  const char *base_dir = "/user/app/PLDM00001";
  const char *param_path = "/user/app/PLDM00001/sce_sys/param.json";
  const char *icon_path = "/user/app/PLDM00001/sce_sys/icon0.png";

  if (stat(base_dir, &st) != 0 || !S_ISDIR(st.st_mode))
    return PLDMGR_LAUNCHER_MISSING;
  if (stat(param_path, &st) != 0 || stat(icon_path, &st) != 0)
    return PLDMGR_LAUNCHER_FILES_INCOMPLETE;
  if (needs_update(param_path, param_json, param_json_size) ||
      needs_update(icon_path, icon0_png, icon0_png_size))
    return PLDMGR_LAUNCHER_FILES_OUTDATED;
  return PLDMGR_LAUNCHER_FILES_READY;
}

size_t pldmgr_get_app_status_json(char *buf, size_t size) {
  PldmgrLauncherStatus status = pldmgr_get_app_status();
  int param_ok = !needs_update("/user/app/PLDM00001/sce_sys/param.json",
                               param_json, param_json_size);
  int icon_ok = !needs_update("/user/app/PLDM00001/sce_sys/icon0.png",
                              icon0_png, icon0_png_size);
  int written = snprintf(buf, size,
      "{\"title_id\":\"PLDM00001\",\"status\":\"%s\","
      "\"files_ready\":%s,\"param_json\":%s,\"icon0_png\":%s,"
      "\"registration\":\"unknown\","
      "\"registration_note\":\"The available SDK API does not provide a reliable read-only registration query. Use repair if the icon is missing.\"}",
      launcher_status_name(status),
      status == PLDMGR_LAUNCHER_FILES_READY ? "true" : "false",
      param_ok ? "true" : "false", icon_ok ? "true" : "false");
  if (written < 0) return 0;
  if ((size_t)written >= size) return size ? size - 1 : 0;
  return (size_t)written;
}

int pldmgr_repair_app(void) {
  /* Re-register even when the embedded files are already current. */
  int err = sceAppInstUtilInitialize();
  if (err) {
    pldmgr_log("[PLDMGR] Launcher repair init failed: 0x%08X\n", err);
    return -1;
  }

  if (pldmgr_get_app_status() != PLDMGR_LAUNCHER_FILES_READY) {
    sceAppInstUtilTerminate();
    return pldmgr_install_app_if_needed();
  }

  err = install_app("PLDM00001", "/user/app/");
  sceAppInstUtilTerminate();
  if (err) {
    pldmgr_log("[PLDMGR] Launcher re-registration failed: 0x%08X\n", err);
    pldmgr_notify("Payload Manager launcher repair failed");
    return -1;
  }
  pldmgr_log("[PLDMGR] Launcher registration repair completed.\n");
  pldmgr_notify("Payload Manager launcher repaired");
  return 0;
}
int pldmgr_install_app_if_needed(void) {
  const char *title_id = "PLDM00001";
  char base_dir[256];
  char param_path[256];
  char icon_path[256];

  snprintf(base_dir, sizeof(base_dir), "/user/app/%s", title_id);
  snprintf(param_path, sizeof(param_path), "/user/app/%s/sce_sys/param.json",
           title_id);
  snprintf(icon_path, sizeof(icon_path), "/user/app/%s/sce_sys/icon0.png",
           title_id);

  int update_needed = 0;
  struct stat st;
  if (stat(base_dir, &st) != 0) {
    update_needed = 1;
  } else {
    if (needs_update(param_path, param_json, param_json_size))
      update_needed = 1;
    if (needs_update(icon_path, icon0_png, icon0_png_size))
      update_needed = 1;
  }

  if (!update_needed) {
    return 0; /* Already installed and up to date */
  }

  if (stat(base_dir, &st) == 0) {
    pldmgr_log("[PLDMGR] Updating existing app launcher (%s)...\n", title_id);
    pldmgr_notify("Updating Payload Manager App...");
  } else {
    pldmgr_log("[PLDMGR] Installing browser launcher app (%s)...\n", title_id);
    pldmgr_notify("Installing Payload Manager App...");
  }

  int err;
  if ((err = sceAppInstUtilInitialize())) {
    pldmgr_log("[PLDMGR] sceAppInstUtilInitialize: error 0x%08X\n", err);
    return -1;
  }

  if (mkdir(base_dir, 0755) && errno != EEXIST) {
    pldmgr_log("[PLDMGR] Failed to create app dir: %s (errno: %d)\n", base_dir,
           errno);
    sceAppInstUtilTerminate();
    return -1;
  }

  char sce_sys_dir[256];
  snprintf(sce_sys_dir, sizeof(sce_sys_dir), "/user/app/%s/sce_sys", title_id);
  if (mkdir(sce_sys_dir, 0755) && errno != EEXIST) {
    pldmgr_log("[PLDMGR] Failed to create sce_sys dir: %s (errno: %d)\n",
           sce_sys_dir, errno);
    sceAppInstUtilTerminate();
    return -1;
  }

  if (install_file(param_path, param_json, param_json_size)) {
    pldmgr_log("[PLDMGR] Failed to install param.json\n");
    sceAppInstUtilTerminate();
    return -1;
  }

  if (install_file(icon_path, icon0_png, icon0_png_size)) {
    pldmgr_log("[PLDMGR] Failed to install icon0.png\n");
    sceAppInstUtilTerminate();
    return -1;
  }

  if ((err = install_app(title_id, "/user/app/"))) {
    pldmgr_log("[PLDMGR] install_app: error 0x%08X\n", err);
    sceAppInstUtilTerminate();
    return -1;
  }

  pldmgr_log("[PLDMGR] Launcher app installed successfully.\n");
  pldmgr_notify("Payload Manager App Ready!");
  
  sceAppInstUtilTerminate();
  return 0;
}
