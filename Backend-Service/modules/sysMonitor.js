import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { exec } from '../lib/runCmd.js';
import { dirCheck } from '../lib/dirCheck.js';
import { writeFile } from '../lib/writeFile.js';
import { console, lang, config } from '../lib/init.js';

export class SysMonitor {
    #enabled = false;
    #dataPath = null;
    #errorCount = 0;
    #tmpDir = null;
    #interval = -1;
    #Timer = null;

    /**
     * 初始化系统监控模块
     * @returns {number} - 0 为成功，其他为错误代码
     */
    init() {
        // 加载配置
        this.#enabled = config.sysMonitor?.enable ?? false;
        this.#dataPath = config.sysMonitor?.dataPath ?? null;
        this.#interval = config.sysMonitor?.interval ?? 1000;

        // 监听间隔检查
        if (this.#interval < 1000) console.warn(lang.public.intervalWarn);
        if (this.#interval > 3600000) this.#interval = 3600000; // 最大间隔为1小时
        if (this.#interval < 100) this.#interval = 100; // 最小间隔为100ms
        if (!this.#enabled || !this.#dataPath) return 0;

        // 数据目录检查
        const errno = dirCheck(this.#dataPath);
        if (errno !== 0) {
            console.error('SysMonitor():', lang.public.initErr, errno);
            return errno;
        }

        // 清理残留数据
        const [oldFiles, readErr] = os.lstat(this.#dataPath + '/system.json');
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error('SysMonitor():', lang.public.isDirErr);
                return 21; // EISDIR
            }
            if (os.remove(this.#dataPath + '/system.json') !== 0) {
                console.error('SysMonitor():', lang.public.removeErr);
                return 5; // EIO
            }
        }

        // 获取临时文件名
        const tmpDirName = exec('mktemp -d /dev/shm/sysmon-XXXXXXXXXXXX');
        if (tmpDirName.exitCode !==0) {
            console.error('SysMonitor():', lang.public.mktempErr);
            return 5; // EIO
        } else {
            this.#tmpDir = tmpDirName.output;
        }

        // 创建符号链接
        if (os.symlink(this.#tmpDir + '/system.json', this.#dataPath + '/system.json') !== 0) {
            console.error('SysMonitor():', lang.public.symlinkErr);
            return 18; // EXDEV
        }

        // 注册信号处理函数
        os.signal(os.SIGINT, () => this.#cleanup());
        os.signal(os.SIGTERM, () => this.#cleanup());
        os.signal(os.SIGQUIT, () => this.#cleanup());

        // 启动定时器
        this.#TimerHandler();

        console.log(lang.SysMonitor.initSuccess, os.getpid());
        return 0;
    }

    /**
     * 内部函数：启动定时器
     * @returns {number} - 0 为成功，其他为错误代码
     */
    #startTimer() {
        if (!this.#enabled || !this.#dataPath) return 0;
        const fd = os.setTimeout(() => this.#TimerHandler(), this.#interval);
        if (!fd) return 4; // EINTR
        this.#Timer = fd;
        return 0;
    }

    /**
     * 内部函数：定时器处理函数
     */
    #TimerHandler() {
        if (!this.#enabled || !this.#dataPath) return;
        // 读取系统信息
        const cpuRaw = std.loadFile('/proc/loadavg');
        const memRaw = std.loadFile('/proc/meminfo');
        if (cpuRaw === null || memRaw === null) {
            console.warn(lang.SysMonitor.readInfoErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
            return;
        }

        // 解析系统信息
        const cpuInfo = cpuRaw.trim().split(' ').slice(0, 4);
        const memInfo = memRaw.trim().split('\n').reduce((acc, line) => {
            const match = line.match(/^([^:]+):\s+(\d+)/);
            if (match) {
                acc[match[1]] = parseInt(match[2], 10);
            }
            return acc;
        }, {});
        const memObject = {
            MemTotal: memInfo['MemTotal'] || 0,
            MemAvailable: memInfo['MemAvailable'] || 0,
            AnonPages: memInfo['AnonPages'] || 0,
            Cached: memInfo['Cached'] || 0,
            Buffers: memInfo['Buffers'] || 0,
            SReclaimable: memInfo['SReclaimable'] || 0,
            SwapTotal: memInfo['SwapTotal'] || 0,
            SwapFree: memInfo['SwapFree'] || 0,
            Committed_AS: memInfo['Committed_AS'] || 0,
            Dirty: memInfo['Dirty'] || 0,
        };

        // 写入临时文件
        if (!writeFile(this.#tmpDir + '/system.json.tmp', JSON.stringify({ timestamp: Date.now(), cpu: cpuInfo, memory: memObject }), 'w')) {
            console.warn(lang.public.writeFileErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
        } else {
            this.#errorCount = 0; // 重置错误计数
        }

        // 替换文件
        os.rename(this.#tmpDir + '/system.json.tmp', this.#tmpDir + '/system.json');

        // 链接检查
        const [_, err] = os.lstat(this.#dataPath + '/system.json');
        if (err !== 0) os.symlink(this.#tmpDir + '/system.json', this.#dataPath + '/system.json')

        // 启动定时器
        const startErr = this.#startTimer();
        if (startErr !== 0) {
            console.error('SysMonitor():', lang.public.startTimerErr);
            this.#cleanup();
            std.exit(startErr);
        }
    }

    /**
     * 内湖函数: 清理残留文件
     * @param {boolean} isexit - 是否退出并返回退出码0 
     */
    #cleanup(isexit = false) {
        console.log('SysMonitor():', lang.public.cleanTip);
        this.#enabled = false;
        this.#interval = -1;
        if (this.#Timer) os.clearTimeout(this.#Timer);
        os.remove(this.#tmpDir + '/system.json');
        os.remove(this.#tmpDir + '/system.json.tmp');
        os.remove(this.#dataPath + '/system.json');
        exec('rm -r ' + this.#tmpDir);
        if (isexit) std.exit(0)
    }
}