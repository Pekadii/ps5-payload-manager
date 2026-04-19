#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <netdb.h>
#include <ifaddrs.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include "utils.h"

int nm_get_local_ip(char *ip_buf, size_t buf_size) {
    struct ifaddrs *ifaddr, *ifa;
    int family, s;

    if (getifaddrs(&ifaddr) == -1) {
        return -1;
    }

    for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
        if (ifa->ifa_addr == NULL) continue;

        family = ifa->ifa_addr->sa_family;

        if (family == AF_INET) {
            /* Skip loopback */
            if (strncmp(ifa->ifa_name, "lo", 2) == 0) continue;

            s = getnameinfo(ifa->ifa_addr, sizeof(struct sockaddr_in),
                           ip_buf, buf_size, NULL, 0, NI_NUMERICHOST);
            if (s == 0) {
                /* Found a valid IP */
                freeifaddrs(ifaddr);
                return 0;
            }
        }
    }

    freeifaddrs(ifaddr);
    return -1;
}
