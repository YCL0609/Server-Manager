import * as std from 'qjs:std';
import { Daemon } from './modules/daemon.js';
import { helpTipShow } from './modules/helpTipShow.js';
import { console, isShowHelp, lang } from './lib/init.js';
import { systemMonitor } from './modules/systemMonitor.js';
import { serviceMonitor } from './modules/serviceMonitor.js';
import { serviceControl } from './modules/serviceControl.js';

// 输出帮助信息
if (isShowHelp) helpTipShow.all();

// 参数映射到模块
const actionMap = {
    '--sysmon': systemMonitor,
    '--svrctrl': serviceControl,
    '--svrmon': serviceMonitor,
};

// 查找匹配的任务
const activeArgs = scriptArgs.filter(arg => Object.keys(actionMap).includes(arg));

// 参数冲突校验
if (activeArgs.length > 1) {
    console.error(lang.init.argErr);
    std.exit(1);
}

// 映射并启动模块
const matchedArg = activeArgs[0];
const Controller = matchedArg ? actionMap[matchedArg] : Daemon;
new Controller();