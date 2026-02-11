import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { writeFile } from './lib/writeFile.js';
import { lang, console } from './lib/init.js';
import { SysMonitor } from './modules/sysMonitor.js';
import { SvrControl } from './modules/svrControl.js';

// 命令行参数
const sysmonIndex = scriptArgs.indexOf('--sysmon');
const svrctrlIndex = scriptArgs.indexOf('--svrctrl');

// 子进程参数列表
const tasks = [
    [...scriptArgs, '--sysmon'],
    [...scriptArgs, '--svrctrl'],
];

if (sysmonIndex !== -1 && svrctrlIndex !== -1) {
    // 参数错误
    console.error(lang.init.argErr);
    std.exit(22); // EINVAL
} else if (sysmonIndex !== -1 && svrctrlIndex === -1) {
    // 系统监控模块
    const sysMonitor = new SysMonitor();
    const initErr = sysMonitor.init();
    if (initErr !== 0) std.exit(initErr);
} else if (svrctrlIndex !== -1 && sysmonIndex === -1) {
    // 服务器控制模块
    const switchIndex = scriptArgs.indexOf('--switch');
    if (switchIndex === -1) {
        // 正常启动
        const srvControl = new SvrControl();
        const initErr = srvControl.init();
        if (initErr !== 0) std.exit(initErr);
    } else {
        // 服务器控制子命令
        const serviceId = parseInt(scriptArgs[switchIndex + 1]);
        const todoId = parseInt(scriptArgs[switchIndex + 2]);
        if (isNaN(serviceId) || isNaN(todoId)) {
            console.error(lang.init.argErr);
            std.exit(22); // EINVAL
        }
        const switchErr = SvrControl.switchService(serviceId, todoId);
        switch (switchErr) {
            case -1:
                console.error(lang.init.argErr);
                std.exit(22); // EINVAL
                break;
            case 0:
                console.log(lang.SvrControl.switchSuccess, `- Service ID: ${serviceId}, Action ID: ${todoId}`);
                std.exit(0);
                break;
            case 1:
                console.error(lang.SvrControl.switchErr, `- Service ID: ${serviceId}, Action ID: ${todoId}`);
                std.exit(5); // EIO
                break;
            default:
                console.error(lang.init.argErr);
                std.exit(22); // EINVAL
                break;
        }
    }
} else {
    // 启动主进程
    if (!getLockFile()) { // 尝试获取锁文件
        console.log(lang.init.inrunning);
        std.exit(0);
    }
    // 启动所有子进程
    let count = 0;
    tasks.forEach(args => {
        if (os.exec(args, { block: false }) >= 0) count++;
    });
    if (count !== tasks.length) console.warn(lang.init.childProcessErr, `(${count}/${tasks.length})`);

    // 等待所有子进程结束
    while (count > 0) {
        const [retPid, status] = os.waitpid(-1, 0);
        if (retPid > 0) count--;
        if (status !== 0) console.warn(lang.init.childProcExitErr, `PID: ${retPid}, Code: ${status >> 8}`);
    }
}

/**
 * 尝试获取锁文件
 * @returns {boolean} - 是否取得锁文件 
 */
function getLockFile() {
    const lockFilePath = '/tmp/server-manager.lock';

    const oldFile = std.loadFile(lockFilePath);
    if (oldFile === null) {
        // 锁文件不存在
        const isok = writeFile(lockFilePath, String(os.getpid()), 'w');
        if (!isok) {
            console.error(lang.init.lockFileErr);
            std.exit(5); // EIO
        }
        return true;
    }

    const oldPid = parseInt(oldFile.trim());
    // 锁文件存在但内容不合法
    if (isNaN(oldPid)) {
        const isok = writeFile(lockFilePath, String(os.getpid()), 'w');
        if (!isok) {
            console.error(lang.init.lockFileErr);
            std.exit(5); // EIO
        }
        return true;
    }

    if (os.kill(oldPid, 0) === 0) return false; // 进程存在
    const isok = writeFile(lockFilePath, String(os.getpid()), 'w');
    if (!isok) {
        console.error(lang.init.lockFileErr);
        std.exit(5); // EIO
    }
    return true; // 进程不存在
}