import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { dirCheck } from '../libs/dirCheck.js';
import { writeFile } from '../libs/writeFile.js';
import { getLockFile } from '../libs/getLockFile.js';
import { console, lang, config } from '../libs/init.js';

export class systemMonitor {
    #enabled = false;
    #dataPath = null;
    #errorCount = 0;
    #interval = -1;
    #Timer = null;

    constructor() {
        getLockFile('system.lock', 'SystemMonitor(): ');

        // 注册信号处理函数
        os.signal(os.SIGINT, () => this.#cleanup(0));
        os.signal(os.SIGTERM, () => this.#cleanup(0));
        os.signal(os.SIGQUIT, () => this.#cleanup(0));

        // 加载配置
        this.#enabled = config.sysMonitor?.enable ?? false;
        this.#dataPath = config.sysMonitor?.dataPath ?? null;
        this.#interval = config.sysMonitor?.interval ?? 1000;

        // 监听间隔检查
        if (this.#interval < 1000) console.warn(lang.public.intervalWarn);
        if (this.#interval > 3600000) this.#interval = 3600000; // 最大间隔为1小时
        if (this.#interval < 100) this.#interval = 100; // 最小间隔为100ms
        if (!this.#enabled || !this.#dataPath) std.exit(0);

        // 数据目录检查
        const errno = dirCheck(this.#dataPath);
        if (errno !== 0) {
            console.error('SystemMonitor():', lang.public.initErr, errno);
            std.exit(errno);
        }

        // 清理残留数据
        const [oldFiles, readErr] = os.lstat(this.#dataPath + '/system.json');
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error('SystemMonitor():', lang.public.isDirErr);
                std.exit(21); // EISDIR
            }
            if (os.remove(this.#dataPath + '/system.json') !== 0) {
                console.error('SystemMonitor():', lang.public.removeErr);
                std.exit(5); // EIO
            }
        }

        // 创建符号链接
        if (os.symlink('/dev/shm/Server-Manager/system.json', this.#dataPath + '/system.json') !== 0) {
            console.error('SystemMonitor():', lang.public.symlinkErr);
            std.exit(18); // EXDEV
        }

        // 启动定时器
        this.#TimerHandler();

        console.log(lang.SysMonitor.initSuccess, os.getpid());
    }

    /**
     * 内部函数: 启动定时器
     * @returns {number} - 0 为成功，其他为错误代码
     */
    #startTimer() {
        if (!this.#enabled) return 0;
        const fd = os.setTimeout(() => this.#TimerHandler(), this.#interval);
        if (!fd) return 4; // EINTR
        this.#Timer = fd;
        return 0;
    }

    /**
     * 内部函数: 定时器处理函数
     */
    #TimerHandler() {
        if (!this.#enabled) return;
        // 读取系统信息
        const cpuRaw = std.loadFile('/proc/loadavg');
        const memRaw = std.loadFile('/proc/meminfo');
        if (cpuRaw === null || memRaw === null) {
            console.warn(lang.SysMonitor.readInfoErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.#cleanup(5); // EIO
            }
            return;
        }

        // 解析系统信息
        const cpuInfo = cpuRaw.trim().split(' ').slice(0, 4);
        const memInfo = memRaw.trim().split('\n').reduce((acc, line) => {
            const match = line.match(/^([^:]+):\s+(\d+)/);
            if (match) acc[match[1]] = parseInt(match[2], 10);
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
        if (!writeFile('/dev/shm/Server-Manager/system.json.tmp', JSON.stringify({ timestamp: Date.now(), cpu: cpuInfo, memory: memObject }), 'w')) {
            console.warn('SystemMonitor():', lang.public.writeFileErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.#cleanup(5); // EIO
            }
        } else {
            this.#errorCount = 0; // 重置错误计数
        }

        // 替换文件
        os.rename('/dev/shm/Server-Manager/system.json.tmp', '/dev/shm/Server-Manager/system.json');

        // 链接检查
        const [_, lerr] = os.lstat(this.#dataPath + '/system.json');
        if (lerr !== 0) os.symlink('/dev/shm/Server-Manager/system.json', this.#dataPath + '/system.json')

        // 启动定时器
        const startErr = this.#startTimer();
        if (startErr !== 0) {
            console.error('SystemMonitor():', lang.public.startTimerErr);
            this.#cleanup(startErr);
        }
    }

    /**
     * 内部函数: 清理残留文件
     * @param {number} [exitCode=0] - 要返回的退出码(默认为0) 
     */
    #cleanup(exitCode = 0) {
        console.log('SystemMonitor():', lang.public.cleanTip);
        this.#enabled = false;
        if (this.#Timer) os.clearTimeout(this.#Timer);
        os.remove('/dev/shm/Server-Manager/system.json');
        os.remove('/dev/shm/Server-Manager/system.json.tmp');
        os.remove(this.#dataPath + '/system.json');
        std.exit(exitCode)
    }
}