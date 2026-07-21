#ifndef APP_INSTALLER_H
#define APP_INSTALLER_H

#include <stddef.h>

/* Installs the Payload Manager app to the home screen if it's not already installed */
typedef enum PldmgrLauncherStatus {
    PLDMGR_LAUNCHER_MISSING = 0,
    PLDMGR_LAUNCHER_FILES_INCOMPLETE = 1,
    PLDMGR_LAUNCHER_FILES_OUTDATED = 2,
    PLDMGR_LAUNCHER_FILES_READY = 3
} PldmgrLauncherStatus;

PldmgrLauncherStatus pldmgr_get_app_status(void);
size_t pldmgr_get_app_status_json(char *buf, size_t size);

int pldmgr_install_app_if_needed(void);
int pldmgr_repair_app(void);

#endif
