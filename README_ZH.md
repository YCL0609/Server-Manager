# Server Manager
English Version: [README.md](README.md)<br><br>
此项目是一个完整的服务器管理系统，提供系统监控、服务控制和管理功能，可使用Web页面和Android移动应用作为客户端。

## 子模块列表
**服务端模块**
- Backend-Service -- 服务端主模块，用于监控系统和控制服务状态
- Backend-Gateway -- 服务端网关，用于验证身份并传递命令到服务端主模块，需要 PHP 7.0+

**客户端模块**
- Client-Android -- Android 客户端，需要 Android WebView 55+
- Frontend -- Web客户端，需要 Chromium 57+ / Gecko 52+ 

## Backend-Service
此模块为服务端主模块，用于监控系统状态和控制服务状态，程序使用js编写并使用quickjs-ng编译.程序正常启动时会启动守护进程并启动所有子进程，目前所有子进程对应的js文件存储在`Backend-Service/modules`中。<br>

**正常运行示例**
```
server-manager # 主进程 (守护进程)
    ├─ server-manager --sysmon  # 系统状态监控进程
    ├─ server-manager --svrmon  # 服务状态监控进程
    └─ server-manager --svrctrl # 服务状态控制进程
```

**文件结构**
```
Backend-Service/
  ├── build.sh      # 构建脚本
  ├── main.js       # 主入口文件
  ├── package.json  # Node.js配置(用于安装esbuild)
  ├── run.sh        # 运行app脚本
  ├── lang/         # 语言文件
  ├── libs/         # 库文件
  └── modules/      # 子模块
        ├── daemon.js         # 守护进程
        ├── helpTipShow.js    # 输出帮助信息
        ├── serviceControl.js # 服务控制
        ├── serviceMonitor.js # 服务监控
        └── systemMonitor.js  # 系统监控
```

**配置文件示例**
```json
{
  "sysMonitor": {
    "enable": true, // 是否启用系统监控
    "dataPath": "/var/www/html/data", // 存储路径
    "interval": 1000 // 每次刷新间隔
  },
  "srvControl": {
    "enable": true, // 是否启动服务监控和控制
    "dataPath": "/var/www/html/data", // 存储路径
    "interval": 1000, // 每次刷新间隔
    "pipegroup": "www-data", // 服务控制模块管道文件所属用户组
    "services": [ // 要监控的服务列表
      "php8.4-fpm.service",
      "nginx.service",
      "test-sleep.service"
    ]
  }
}
```

**安装依赖并构建**
```bash
cd Backend-Service
sudo pacman -S musl base-devel cmake # 若未安装nodejs和git则在末尾添加[nodejs npm git] 
git clone https://github.com/quickjs-ng/quickjs.git ./bin
cd bin
cmake -DCMAKE_C_COMPILER=musl-gcc -DCMAKE_EXE_LINKER_FLAGS="-static" .
make -j$(nproc)
cd ..
npm install
./build.sh # 构建
```
构建后可执行文件在`./out/server-manager`。

## Backend-Gateway
此模块为服务端网关，用于验证身份并传递命令到服务端主模块，使用PHP编写运行需要PHP 7.0+。

**文件结构**
```
Backend-Gateway/
  ├── genkey.sh       # 生成RSA密钥脚本
  ├── index.php       # 网关入口文件
  ├── key.php         # 密钥保存文件
  └── key_public.pem  # 公钥文件 (!!! 请不要将这个文件暴露在公网 !!!)
```

**构建**
```bash
cd Backend-Gateway
./genkey.sh
```
构建完成后请安全保存`key_public.pem`到本地，然后复制两个php文件到web目录即可。

## Client-Android
此模块为Android客户端，用于移动设备上的服务器管理，需要 Android 6+ 且 Android WebView 55+ 。对于 Android 6- 只要确保 Android WebView 55+ 程序仍然可以正常运行。用户可自行下载新版本并移动到`Client-Android/app/src/main/assets/js/jsencrypt.min.js`。

**构建**<br>
使用Android Studio打开 `Client-Android` 文件夹，执行`Build -> Generate Signed App Bundle or APK...`。

## Frontend
此模块为Web客户端，用于浏览器中的服务器管理，需要Chromium 57+ / Gecko 52+。此模块使用了JSEncrypt模块，用户可自行下载新版本并移动到`Frontend/js/jsencrypt.min.js`。

**构建**<br>
修改`js/index.js`来添加服务器信息。
```javascript
const config = {
    serverURL: './data/', // 服务器数据URL (结尾必须为/)
    controlURL: './control/index.php', // 服务器控制API URL
    interval: 60000, // 更新间隔 (单位: ms)
    // ....
};
```
然后复制`Frontend`文件夹内所有文件到web目录。