import * as os from 'qjs:os';
import * as std from 'qjs:std';
import langText from '../lang/list.js';

// 控制台实现
const console = {
    log: (...args) => print('[INFO] ' + args.join(' ')),
    warn: (...args) => std.err.puts('[WARN] ' + args.join(' ') + '\n'),
    error: (...args) => std.err.puts('[ERROR] ' + args.join(' ') + '\n')
};

// 命令行参数
const args = scriptArgs ?? [''];

// 用户偏好语言
const _envLang = std.getenv('LC_ALL') || std.getenv('LC_MESSAGES') || std.getenv('LANG') || 'en';
const _rawLang = _envLang.toLowerCase();
const lang = langText[_rawLang.includes('zh') ? 'zh' : 'en'];

// 处理配置文件
const _cfgIndex = args.indexOf('-c');
const _cfgPath = (_cfgIndex !== -1) ? args[_cfgIndex + 1] : '/etc/ycl_server_manager.cfg';
const [_cfgDetail, _cfgerr] = os.stat(_cfgPath)
if (_cfgerr !== 0) {
    console.error(lang.init.statErr, _cfgerr);
    std.exit(2);
}
if (_cfgDetail?.uid !== 0 || (_cfgDetail?.mode & 0o777) !== 0o644) {
    console.warn(lang.init.fileModeErr);
    std.exit(13);
}
const _rawConfig = std.loadFile(_cfgPath);
if (_rawConfig === null) {
    console.error(lang.init.readErr);
    std.exit(5);
}
const config = (() => {
    try {
        return JSON.parse(_rawConfig);
    } catch (e) {
        console.error(lang.init.parseErr);
        std.exit(1);
    }
})()


export {
    args,
    lang,
    config,
    console,
}