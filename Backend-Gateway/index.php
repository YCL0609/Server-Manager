<?php
// header("Access-Control-Allow-Origin: *");
// header("Access-Control-Allow-Headers: token");
// header("Access-Control-Allow-Methods: POST");
// header("Cache-Control: no-store, no-cache, must-revalidate");

// if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
//     http_response_code(405);
//     die();
// }

// // Token校验
// include "key.php";
// if ($privKey === false || $pubKey === false) {
//     http_response_code(500);
//     die('500 Internal Server Error');
// }
// try {
//     if (!openssl_private_decrypt(base64_decode($_SERVER['HTTP_TOKEN']), $Token_Data, $privKey)) throw new Exception();
//     $data = json_decode($Token_Data, true);
//     if (!is_array($data)) throw new Exception();
//     if (!isset($data['time']['date'], $data['time']['zone'], $data['time']['offset'])) throw new Exception();

//     // 设置允许的时间戳缓冲时间 (单位: s)
//     $dateRange = 90;

//     // 设置允许的时区和UTC偏移量
//     /* 
//         IANA ID: America/Halifax
//         Offset: UTC-3(夏令时) UTC-4(冬令时)
//     */
//     $zone = array('America/Halifax');
//     $offset = array(-3, -4);
//     /* 
//         IANA ID: Asia/Shanghai
//         Offset: UTC+8
//     */
//     // $zone = array('Asia/Shanghai');
//     // $offset = array(+8);

//     // 验证时间戳、时区和UTC偏移量
//     $timeDiff = (substr($data['time']['date'], 0, -3) - time());
//     if ($timeDiff > $dateRange || $timeDiff < 0) throw new Exception();
//     if ((substr($data['time']['date'], 0, -3) - $time) > $dateRange) throw new Exception();
//     if (!in_array($data['time']['zone'], $zone)) throw new Exception();
//     if (!in_array($data['time']['offset'], $offset)) throw new Exception();
// } catch (Exception $_) {
//     http_response_code(401);
//     die('401 Unauthorized');
// }

// 允许的操作
$allowAct = array('start', 'stop', 'restart');

// 提取请求数据
$action = trim($_POST['action']) ?? '';
$serviceRaw = trim($_POST['service']) ?? '';
$serviceTmp = str_replace('|', '', $serviceRaw);
$serviceName = str_replace(';', '', $serviceTmp);

// 合规性校验
if (!in_array($action, $allowAct)) {
    http_response_code(400);
    die('400 Bad Request');
}

try {
    $file = fopen('/dev/shm/servicesControl.tmp', 'w');
    fwrite($file, 'srvControl|' . time() . '000|' . $serviceName . '|' . $action);
    fclose($file);
    rename('/dev/shm/servicesControl.tmp', '/dev/shm/servicesControl');
} catch (Exception $_) {
    http_response_code(500);
    die('500 Internal Server Error');
}

http_response_code(202);
echo '202 Accepted';