import * as os from 'qjs:os';
import * as std from 'qjs:std';
import langText from '../lang/list.js';
import { dirCheck } from './dirCheck.js';
import { writeFile } from './writeFile.js';

// 程序版本
const version = '0.7';

// 是否输出帮助信息
const isShowHelp = scriptArgs.includes('--help') || scriptArgs.includes('-h');

// 控制台实现
const console = {
    log: (...args) => print('[INFO] ' + args.join(' ')),
    warn: (...args) => std.err.puts('[WARN] ' + args.join(' ') + '\n'),
    error: (...args) => std.err.puts('[ERROR] ' + args.join(' ') + '\n')
};

// 用户偏好语言
const _envLang = std.getenv('LC_ALL') || std.getenv('LC_MESSAGES') || std.getenv('LANG') || 'en';
const _rawLang = _envLang.toLowerCase();
const lang = langText[_rawLang.includes('zh') ? 'zh' : 'en'];

// 加载配置文件
const _cfgIndex = scriptArgs.indexOf('-c');
const _cfgPath = (_cfgIndex !== -1) ? scriptArgs[_cfgIndex + 1] : '/etc/server_manager.cfg';
const _rawConfig = std.loadFile(_cfgPath);
if (_rawConfig === null && !isShowHelp) {
    console.error(lang.init.readErr);
    std.exit(5);
}
const config = (() => {
    try {
        return JSON.parse(_rawConfig);
    } catch (e) {
        if (!isShowHelp) {
            console.error(lang.init.parseErr);
            std.exit(1);
        }
    }
})();

/**
 * 尝试获取锁文件 (成功则返回锁路径，失败则结束当前进程)
 * @param {string} lockFile - 锁文件路径
 * @param {string} [errTitle=''] - 错误显示前缀
*/
function getLockFile(lockFile = '', errTitle = '') {
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
        const DirOk = dirCheck('/dev/shm/Server-Manager');
        const isFileok = writeFile('/dev/shm/Server-Manager/' + lockFile, String(os.getpid()), 'w');
        if (DirOk !== 0 || !isFileok) {
            console.error(errTitle + lang.init.lockFileErr);
            std.exit(5); // EIO
        }
    }
}

export {
    lang,
    config,
    console,
    version,
    isShowHelp,
    getLockFile,
}