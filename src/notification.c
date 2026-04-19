#include <stdio.h>
#include <string.h>
#include <stdarg.h>
#include <unistd.h>
#include "notification.h"

/* PS5 SDK Function */
int sceKernelSendNotificationRequest(int device, notify_request_t* request, size_t size, int unused);

void nm_notify(const char *fmt, ...) {
    notify_request_t req;
    va_list args;

    memset(&req, 0, sizeof(req));
    va_start(args, fmt);
    vsnprintf(req.message, sizeof(req.message), fmt, args);
    va_end(args);

    /* On real PS5 hardware, this will show a notification */
    /* On other systems, it might fail or we can fallback to stdout */
#ifdef __SCE__
    sceKernelSendNotificationRequest(0, &req, sizeof(req), 0);
#else
    /* Fallback/Logging */
    printf("[Notification] %s\n", req.message);
#endif
}
