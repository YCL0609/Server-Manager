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
    const lockFilePath = '/tmp/server-manager.lock';
    if (!getLockFile(lockFilePath)) { // 尝试获取锁文件
        console.log(lang.init.inrunning);
        std.exit(0);
    }
    console.log(lang.init.initSuccess, os.getpid())


    // 追踪子进程 PID
    const childPids = [];

    // 清理函数
    const cleanup = () => {
        console.log(lang.public.cleanTip);
        childPids.forEach(pid => {
            try {
                os.kill(pid, 15);
            } catch (_) { }
        });
        // 移除锁文件
        os.remove(lockFilePath);
        std.exit(0);
    };

    // 监听中断信号
    os.signal(os.SIGINT, cleanup);
    os.signal(os.SIGTERM, cleanup);

    // 启动所有子进程
    tasks.forEach(args => {
        const pid = os.exec(args, { block: false });
        if (pid >= 0) {
            childPids.push(pid);
        }
    });

    let count = childPids.length;
    if (count !== tasks.length) {
        console.warn(lang.init.childProcessErr, `(${count}/${tasks.length})`);
    }

    // 等待所有子进程结束
    while (count > 0) {
        const [retPid, status] = os.waitpid(-1, 0);
        if (retPid > 0) {
            count--;
            // 从追踪列表中移除
            const idx = childPids.indexOf(retPid);
            if (idx > -1) childPids.splice(idx, 1);
            if (status !== 0) console.warn(lang.init.childProcExitErr, `PID: ${retPid}, Code: ${status >> 8}`);
        } else {
            // 如果 waitpid 被信号中断，检查 count 并在循环中继续
            if (count <= 0) break;
        }
    }

    // 正常运行结束也清理锁文件
    os.remove(lockFilePath);
}

/**
 * 尝试获取锁文件
 * @param {string} lockFilePath
 * @returns {boolean} - 是否取得锁文件 
 */
function getLockFile(lockFilePath) {
    const oldFile = std.loadFile(lockFilePath);
    if (oldFile === null) {
        const isok = writeFile(lockFilePath, String(os.getpid()), 'w');
        if (!isok) {
            console.error(lang.init.lockFileErr);
            std.exit(5); // EIO
        }
        return true;
    }

    const oldPid = parseInt(oldFile.trim());
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
    return true;
}