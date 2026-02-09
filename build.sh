#!/bin/sh
echo ">>> 初始化输出目录..."
rm -rf ./out
mkdir -p out
echo ">>> 打包JS并生成C代码..."
./bin/qjsc -e -o out/server-manager.c main.js
du -h ./out/server-manager.c
echo ">>> 生成可执行文件..."
musl-gcc -Os -flto -D_GNU_SOURCE -static \
  -ffunction-sections -fdata-sections \
  -I./bin -L./bin \
  out/server-manager.c bin/quickjs-libc.c \
  -o out/server-manager \
  -Wl,--gc-sections \
  -lqjs -lm -s
chmod +x ./out/server-manager
ls -lah --color=tty ./out/server-manager