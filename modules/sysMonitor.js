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
    #tmpFile = null;
    #interval = -1;
    #timmer = null;

    /**
      * 初始化系统监控模块
      * @param {Object} config - 配置文件对象
      * @returns {number} - 0 为成功，-1为被禁用，其他为错误代码
     */
    init() {
        this.#enabled = config.sysMonitor?.enable ?? false;
        this.#dataPath = config.sysMonitor?.dataPath ?? null;
        this.#interval = config.sysMonitor?.interval ?? 1000;
        if (!this.#enabled || !this.#dataPath) return 0;

        // 检查数据目录
        const errno = dirCheck(this.#dataPath);
        if (errno !== 0) {
            console.error(lang.SysMonitor.initErr, errno);
            return errno;
        }

        // 清理残留数据
        const [oldFiles, readErr] = os.stat(this.#dataPath + '/status.json');
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error(lang.SysMonitor.isDirErr);
                return 21; // EISDIR
            }
            if (os.remove(this.#dataPath + '/status.json') !== 0) {
                console.error(lang.SysMonitor.removeErr);
                return 5; // EIO
            }
        }

        // 获取临时文件名
        const tmpFileName = exec(`mktemp /dev/shm/sysmon-XXXXXXXXXXXX`);
        if (!tmpFileName) {
            console.error(lang.SysMonitor.mktempErr);
            return 5; // EIO
        } else {
            this.#tmpFile = tmpFileName.trim();
        }

        // 创建符号链接
        if (os.symlink(this.#tmpFile, this.#dataPath + '/status.json') !== 0) {
            console.error(lang.SysMonitor.symlinkErr);
            return 18; // EXDEV
        }

        // 启动定时器
        const startErr = this.#startTimmer();
        if (startErr !== 0) {
            console.error(lang.SysMonitor.startTimmerErr);
            this.cleanup();
            return startErr;
        }

        // 注册信号处理函数
        os.signal(os.SIGINT, () => this.cleanup());
        os.signal(os.SIGTERM, () => this.cleanup());
        os.signal(os.SIGQUIT, () => this.cleanup());

        console.log(lang.SysMonitor.initSuccess);
        return 0;
    }

    /**
     * 内部方法：启动定时器
     * @returns {number} - 0 为成功，其他为错误代码
     */
    #startTimmer() {
        if (!this.#enabled || !this.#dataPath) return 0;
        const fd = os.setTimeout(() => this.#TimmerHandler(), this.#interval);
        if (!fd) return 4; // EINTR
        this.#timmer = fd;
        return 0;
    }

    /**
     * 内部方法：定时器处理函数
     */
    #TimmerHandler() {
        // 读取系统信息
        const cpuRaw = std.loadFile('/proc/loadavg');
        const memRaw = std.loadFile('/proc/meminfo');
        if (cpuRaw === null || memRaw === null) {
            console.warn(lang.SysMonitor.readInfoErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.cleanup();
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

        // 写入临时文件
        if (!writeFile(this.#tmpFile, JSON.stringify({ cpu: cpuInfo, memory: memInfo }), 'w')) {
            console.warn(lang.SysMonitor.writeFileErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SysMonitor.errorCount);
                this.cleanup();
                std.exit(5); // EIO
            }
        } else {
            this.#errorCount = 0; // 重置错误计数
        }
        if (this.#enabled) this.#startTimmer();

    }
    1
    /**
     * 清理残留文件
     */
    cleanup() {
        this.#enabled = false;
        this.#interval = -1;
        if (this.#timmer) os.clearTimeout(this.#timmer);
        if (this.#tmpFile) {
            const removeErr = os.remove(this.#tmpFile);
            if (removeErr !== 0) console.warn(lang.SysMonitor.removeErr, removeErr);
        }
        if (this.#dataPath) {
            const removeErr = os.remove(this.#dataPath + '/status.json');
            if (removeErr !== 0) console.warn(lang.SysMonitor.removeErr, removeErr);
        }
    }
}