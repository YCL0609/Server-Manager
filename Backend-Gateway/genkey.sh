#!/bin/bash

# 生成密钥对
openssl genrsa -out key_up_private.pem 2048
openssl rsa -in key_up_private.pem -pubout -out key_up_public.pem

openssl genrsa -out key_down_private.pem 2048
openssl rsa -in key_down_private.pem -pubout -out key_down_public.pem

# 获取当前日期 (UTC-3)
offset=$(date +%z)
date_str=$(date +"%Y-%m-%d %H:%M")

# 生成 key.php 文件
cat <<EOF > key.php
<?php
\$Key_up_raw = "$(cat key_up_private.pem)";

\$Key_down_raw = "$(cat key_down_public.pem)";

/**** RSA 2048 ****/
/**** 密钥修改日期: $date_str (UTC${offset:0:3}) ****/

\$Key_up = openssl_pkey_get_private(\$Key_up_raw);
\$Key_down = openssl_pkey_get_public(\$Key_down_raw);
EOF

# 删除对应的 pem 文件
rm key_down_public.pem
rm key_up_private.pem

echo "密钥生成日期: $date_str (UTC${offset:0:3})"