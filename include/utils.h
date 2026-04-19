#pragma once

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Gets the local IP address. Returns 0 on success, -1 on failure. */
int nm_get_local_ip(char *ip_buf, size_t buf_size);

#ifdef __cplusplus
}
#endif
