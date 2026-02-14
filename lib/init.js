import * as os from 'qjs:os';
import * as std from 'qjs:std';
import langText from '../lang/list.js';

// 程序版本
const version = '0.3'

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

// 处理配置文件
const _cfgIndex = scriptArgs.indexOf('-c');
const _cfgPath = (_cfgIndex !== -1) ? scriptArgs[_cfgIndex + 1] : '/etc/server_manager.cfg';
const [_cfgDetail, _cfgerr] = os.stat(_cfgPath);
if (_cfgerr !== 0 && !isShowHelp) {
    console.error(lang.init.statErr, _cfgerr);
    std.exit(2);
}
const _isModeOK = _cfgDetail?.uid !== 0 || (_cfgDetail?.mode & 0o777) !== 0o644;
if (_isModeOK && !isShowHelp) {
    console.warn(lang.init.fileModeErr);
    std.exit(13);
}
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
})()


export {
    lang,
    config,
    console,
    version,
    isShowHelp,
}