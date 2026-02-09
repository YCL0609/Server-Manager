#!/bin/sh
echo ">>> 初始化输出目录..."
rm -rf ./out
mkdir -p out
echo ">>> 打包JS并生成C代码..."
./bin/qjsc -e -o out/server-manager.c main.js
du -h ./out/server-manager.c
echo ">>> 生成可执行文件..."
musl-gcc -O3 -D_GNU_SOURCE -static -s \
  out/server-manager.c bin/quickjs-libc.c \
  -I./bin -L./bin \
  -o out/server-manager \
  -lqjs -lm
chmod +x ./out/server-manager
ls -lah --color=tty ./out/server-manager
