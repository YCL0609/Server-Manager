import * as std from 'qjs:std';
import * as os from 'qjs:os';
import { dirCheck } from './dirCheck';
import { writeFile } from './writeFile';

/**
 * 尝试获取锁文件 (成功则返回锁路径，失败则结束当前进程)
 * @param {string} lockFile - 锁文件路径
 * @param {string} [errTitle=''] - 错误显示前缀
*/
export function getLockFile(lockFile = '', errTitle = '') {
    if (!lockFile.trim()) return;

    // 尝试获取旧锁文件
    const oldFile = std.loadFile(lockFile);
    if (oldFile === null) return getLock();

    // 判断内容合规性
    const oldPid = parseInt(oldFile.trim());
    if (isNaN(oldPid)) return getLock();

    // 检测旧进程是否存在
    if (os.kill(oldPid, 0) === 0) {
        console.log(errTitle + lang.init.inrunning);
        std.exit(0);
    } else { return getLock(); }

    // 写锁文件
    function getLock() {
        const DirOk = dirCheck('/run/server-manager');
        const isFileok = writeFile('/run/server-manager/' + lockFile, String(os.getpid()), 'w');
        if (DirOk !== 0 || !isFileok) {
            console.error(errTitle + lang.init.lockFileErr);
            std.exit(5); // EIO
        }
    }
}