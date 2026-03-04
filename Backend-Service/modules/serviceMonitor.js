import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { exec } from '../libs/runCmd.js';
import { dirCheck } from '../libs/dirCheck.js';
import { writeFile } from '../libs/writeFile.js';
import { getLockFile } from '../libs/getLockFile.js';
import { lang, console, config } from '../libs/init.js';

export class serviceMonitor {
    #enabled = false;
    #dataPath = null;
    #errorCount = 0;
    #interval = -1;
    #Timer = null;
    #services = [];
    #serviceFilter = '';

    constructor() {
        getLockFile('service.lock', 'ServiceMonitor(): ');

        // 注册信号处理函数
        os.signal(os.SIGINT, () => this.#cleanup(0));
        os.signal(os.SIGTERM, () => this.#cleanup(0));
        os.signal(os.SIGQUIT, () => this.#cleanup(0));
        os.signal(os.SIGUSR1, () => {
            // 手动更新信号
            if (this.#Timer) os.clearTimeout(this.#Timer);
            this.#TimerHandler();
        })

        // 加载配置
        this.#enabled = config.srvControl?.enable ?? false;
        this.#dataPath = config.srvControl?.dataPath ?? null;
        this.#interval = config.srvControl?.interval ?? 1000;
        this.#services = config.srvControl?.services ?? [];
        this.#serviceFilter = this.#services.join(' ').replaceAll('&', '');
        if (!this.#enabled || !this.#dataPath.trim() || this.#services.length === 0) std.exit(0);

        // 监听间隔检查
        if (this.#interval < 1000) console.warn(lang.public.intervalWarn);
        if (this.#interval > 3600000) this.#interval = 3600000; // 最大间隔为1小时
        if (this.#interval < 100) this.#interval = 100; // 最小间隔为100ms

        // 数据目录检查
        const errno = dirCheck(this.#dataPath);
        if (errno !== 0) {
            console.error('ServiceMonitor():', lang.public.initErr, errno);
            std.exit(errno);
        }

        // 清理残留数据
        const [oldFiles, readErr] = os.lstat(this.#dataPath + '/service.json');
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error('ServiceMonitor():', lang.public.isDirErr);
                std.exit(21); // EISDIR
            }
            if (os.remove(this.#dataPath + '/service.json') !== 0) {
                console.error('ServiceMonitor():', lang.public.removeErr);
                std.exit(5); // EIO
            }
        }

        // 创建符号链接
        if (os.symlink('/dev/shm/Server-Manager/service.json', this.#dataPath + '/service.json') !== 0) {
            console.error('ServiceMonitor():', lang.public.symlinkErr);
            std.exit(18); // EXDEV
        }

        // 启动定时器
        this.#TimerHandler();

        console.log(lang.SvrMonitor.initSuccess, os.getpid());
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

        // 获取服务状态
        const svStatusRaw = exec(`SYSTEMD_COLORS=0 timeout 5 systemctl show ${this.#serviceFilter} --property=Id,LoadState,ActiveState,SubState,Description`);
        if (svStatusRaw.exitCode !== 0) {
            console.warn(lang.SvrMonitor.readInfoErr);

            // 错误计数
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error('ServiceMonitor():', lang.public.errorCount);
                this.#cleanup(5); // EIO
            }

            return;
        } else { this.#errorCount = 0 };

        // 解析数据
        let currentUnit = {};
        const svStatus = {};
        const lines = svStatusRaw.output.split('\n');

        lines.forEach(line => {
            const [key, ...valParts] = line.split('=');
            if (!key || valParts.length === 0) return;
            const value = valParts.join('=');

            if (key === 'Id') {
                currentUnit = { id: value };
                svStatus[value] = currentUnit;
            } else if (currentUnit.id) {
                if (key === 'LoadState') currentUnit.load = value;
                if (key === 'ActiveState') currentUnit.active = value;
                if (key === 'SubState') currentUnit.sub = value;
                if (key === 'Description') currentUnit.description = value;
            }
        });

        // 存储服务状态
        const data = {
            timestamp: Date.now(),
            services: this.#services.map(srv => ({
                name: srv,
                status: svStatus[srv] || {
                    load: 'not-found',
                    active: 'inactive',
                    sub: 'dead',
                    description: 'Unit not found or never loaded'
                }
            }))
        };

        // 写入临时文件
        if (!writeFile('/dev/shm/Server-Manager/service.json.tmp', JSON.stringify(data), 'w')) {
            console.warn('ServiceMonitor():', lang.public.writeFileErr);

            // 错误计数
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error('ServiceMonitor():', lang.public.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
            return
        } else {
            this.#errorCount = 0; // 重置错误计数
        }

        // 替换文件
        if (os.rename('/dev/shm/Server-Manager/service.json.tmp', '/dev/shm/Server-Manager/service.json') !== 0) {
            console.warn('ServiceMonitor():', lang.public.writeFileErr);

            // 错误计数
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error('ServiceMonitor():', lang.public.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
            return
        } else {
            this.#errorCount = 0; // 重置错误计数
        }

        // 链接检查
        const [_, lerr] = os.lstat(this.#dataPath + '/service.json');
        if (lerr !== 0) os.symlink('/dev/shm/Server-Manager/service.json', this.#dataPath + '/service.json')

        // 启动定时器
        const startErr = this.#startTimer();
        if (startErr !== 0) {
            console.error(lang.public.startTimerErr);
            this.#cleanup(startErr);
        }
    }

    /**
     * 内部函数: 清理残留文件
     * @param {number} [exitCode=0] - 要返回的退出码(默认为0) 
     */
    #cleanup(exitCode = 0) {
        console.log('ServiceMonitor():', lang.public.cleanTip);
        this.#enabled = false;
        if (this.#Timer) os.clearTimeout(this.#Timer);
        os.remove('/dev/shm/Server-Manager/service.json');
        os.remove('/dev/shm/Server-Manager/service.json.tmp');
        os.remove(this.#dataPath + '/service.json');
        os.remove('/dev/shm/Server-Manager/service.lock');
        std.exit(exitCode);
    }
}
