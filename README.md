# Server Manager
中文版: [README_ZH.md](README_ZH.md)<br>
<b><i>If the Chinese and English versions differ in meaning, the Chinese version takes precedence.</i></b><br>

This project is a complete server management system that provides system monitoring, service control, and management features. It supports both Web and Android mobile applications as clients.

## Modules List
**Backend Modules**
- Backend-Service -- Main backend module for monitoring system status and controlling service states
- Backend-Gateway -- Backend gateway for authentication and command forwarding to the main backend module, requires PHP 7.0+

**Client Modules**
- Client-Android -- Android client, requires Android WebView 55+
- Frontend -- Web client, requires Chromium 57+ / Gecko 52+

## Backend-Service
This is the main backend module for monitoring system status and controlling service states. The program is written in JavaScript and compiled with quickjs-ng. When started normally, it launches a daemon process and starts all child processes. Currently, all child processes correspond to JavaScript files stored in `Backend-Service/modules`.

**Normal Execution Example**
```
server-manager # Main process (daemon)
    ├─ server-manager --sysmon  # System status monitoring process
    ├─ server-manager --svrmon  # Service status monitoring process
    └─ server-manager --svrctrl # Service status control process
```

**File Structure**
```
Backend-Service/
  ├── build.sh      # Build script
  ├── main.js       # Main entry file
  ├── package.json  # Node.js configuration (for installing esbuild)
  ├── run.sh        # Run script
  ├── lang/         # Language files
  ├── libs/         # Library files
  └── modules/      # Sub-modules
        ├── daemon.js         # Daemon process
        ├── helpTipShow.js    # Help information output
        ├── serviceControl.js # Service control
        ├── serviceMonitor.js # Service monitoring
        └── systemMonitor.js  # System monitoring
```

**Configuration File Example**
```json
{
  "sysMonitor": {
    "enable": true, // Enable system monitoring
    "dataPath": "/var/www/html/data", // Storage path
    "interval": 1000 // Refresh interval
  },
  "srvControl": {
    "enable": true, // Enable service monitoring and control
    "dataPath": "/var/www/html/data", // Storage path
    "interval": 1000, // Refresh interval
    "pipegroup": "www-data", // User group that owns the service control module pipe file
    "services": [ // List of services to monitor
      "php8.4-fpm.service",
      "nginx.service",
      "test-sleep.service"
    ]
  }
}
```

**Install Dependencies and Build**
```bash
cd Backend-Service
sudo pacman -S musl base-devel cmake # If nodejs, git are not installed, add [nodejs npm git] at the end
git clone https://github.com/quickjs-ng/quickjs.git ./bin
cd bin
cmake -DCMAKE_C_COMPILER=musl-gcc -DCMAKE_EXE_LINKER_FLAGS="-static" .
make -j$(nproc)
cd ..
npm install
./build.sh # Build
```

After building, the executable is located at `./out/server-manager`.

## Backend-Gateway
This module is the backend gateway for authentication and command forwarding to the main backend module. It is written in PHP and requires PHP 7.0+.

**File Structure**
```
Backend-Gateway/
  ├── genkey.sh       # RSA key generation script
  ├── index.php       # Gateway entry file
  ├── key.php         # Key storage file
  └── key_public.pem  # Public key file (!!! Do NOT expose this file on the public internet !!!)
```

**Build**
```bash
cd Backend-Gateway
./genkey.sh
```

After building, please securely save `key_public.pem` locally, then copy the two PHP files to the web directory.

## Client-Android
This module is the Android client for server management on mobile devices. It requires Android 6+ and Android WebView 55+. For Android 6 and below, as long as Android WebView 55+ is installed, the application will function normally. Users can download the latest version and move it to `Client-Android/app/src/main/assets/js/jsencrypt.min.js`.

**Build**<br>
Open the `Client-Android` folder with Android Studio and execute `Build -> Generate Signed App Bundle or APK...`.

## Frontend
This module is the Web client for server management in a browser. It requires Chromium 57+ / Gecko 52+. This module uses the JSEncrypt module. Users can download the latest version and move it to `Frontend/js/jsencrypt.min.js`.

**Build**<br>
Modify `js/index.js` to add server information.
```javascript
const config = {
    serverURL: './data/', // Server data URL (must end with /)
    controlURL: './control/index.php', // Server control API URL
    interval: 60000, // Update interval (unit: ms)
    // ....
};
```

Then copy all files in the `Frontend` folder to the web directory.