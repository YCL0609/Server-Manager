#!/bin/sh
rm -rf ./out
mkdir -p out
./bin/qjsc -s -o ./out/main main.js
chmod +x ./out/main