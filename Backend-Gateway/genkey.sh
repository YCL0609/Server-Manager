#!/bin/bash

# 生成密钥对
openssl genrsa -out key_private.pem 2048
openssl rsa -in key_private.pem -pubout -out key_public.pem

# 获取当前日期 (UTC-3)
offset=$(date +%z)
date_str=$(date +"%Y-%m-%d %H:%M")

# 生成 key.php 文件
cat <<EOF > key.php
<?php
\$KeyRaw = "$(cat key_private.pem)";

/*** 密钥修改日期: $date_str (UTC${offset:0:3}) ***/

\$RSAKey = openssl_pkey_get_public(\$KeyRaw);
EOF

# 删除对应的 pem 文件
rm key_private.pem

echo "密钥生成日期: $date_str (UTC${offset:0:3})"