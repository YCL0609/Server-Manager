#!/bin/sh
./build.sh
echo ------------------------------
./out/server-manager $@
code=$?
echo ------------------------------
echo "程序退出 (Code: $code)"