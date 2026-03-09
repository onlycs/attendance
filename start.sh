#!/bin/bash

# get the TZ env var, default to America/New_York if not set
TZ=${TZ:-America/New_York}
rm -f /etc/localtime
ln -s /usr/share/zoneinfo/$TZ /etc/localtime

export TZ
/var/www/attendance/attendance-api
