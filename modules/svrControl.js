import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { writeFile } from '../lib/writeFile.js';
import { dirCheck } from '../lib/dirCheck.js';
import { lang, console, config } from '../lib/init.js';
import { exec } from '../lib/runCmd.js';
import { watchFile } from '../lib/watchFile.js';

export class SvrControl {
    #enabled = false;
    #dataPath = null;
    #services = [];
    #errorCount = 0;
    #tmpDir = null;
    #interval = -1;
    #timmer = null;
    #inprocessing = true;
    static #partLength = 4;
    static #alowAction = ['start', 'stop', 'restart'];

    /**
     * 初始化服务控制模块
     * @returns {number} - 0 为成功，其他为错误代码
     */
    init() {
        // 加载配置
        this.#enabled = config.srvControl?.enable ?? false;
        this.#dataPath = config.srvControl?.dataPath ?? null;
        this.#services = config.srvControl?.services ?? [];
        this.#interval = config.srvControl?.interval ?? 1000;

        // 监听间隔检查
        if (this.#interval < 1000) console.warn(lang.public.intervalWarn);
        if (this.#interval > 3600000) this.#interval = 3600000; // 最大间隔为1小时
        if (this.#interval < 100) this.#interval = 100; // 最小间隔为100ms
        if (!this.#enabled || !this.#dataPath || this.#services.length === 0) return 0;

        // 数据目录检查
        const errno = dirCheck(this.#dataPath);
        if (errno !== 0) {
            console.error('SvrControl():', lang.public.initErr, errno);
            return errno;
        }

        // 清理残留数据
        const [oldFiles, readErr] = os.stat(this.#dataPath + '/service.json');
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error('SvrControl():', lang.public.isDirErr);
                return 21; // EISDIR
            }
            if (os.remove(this.#dataPath + '/service.json') !== 0) {
                console.error('SvrControl():', lang.public.removeErr);
                return 5; // EIO
            }
        }

        // 获取临时文件名
        const tmpDirName = exec('mktemp -d /dev/shm/svrControl-XXXXXXXXXXXX');
        if (!tmpDirName) {
            console.error('SvrControl():', lang.public.mktempErr);
            return 5; // EIO
        } else {
            this.#tmpDir = tmpDirName.trim();
        }

        // 创建符号链接
        if (os.symlink(this.#tmpDir + '/service.json', this.#dataPath + '/service.json') !== 0) {
            console.error('SvrControl():', lang.public.symlinkErr);
            return 18; // EXDEV
        }

        // 初始化控制文件
        if (!writeFile('/dev/shm/servicesControl', '', 'w')) {
            console.error('SvrControl():', lang.public.mktempErr);
            return 5; // EIO
        }

        // 设置控制文件权限 600(-rw-------)
        if (exec('chmod 600 /dev/shm/servicesControl') === null) {
            console.error('SvrControl():', lang.SvrControl.chmodWarn);
            return 5; // EIO
        }

        // 监听控制文件变化
        watchFile('/dev/shm/servicesControl', errno => this.#fileChangeHandler(errno));

        // 注册信号处理函数
        os.signal(os.SIGINT, () => this.#cleanup(true));
        os.signal(os.SIGTERM, () => this.#cleanup(true));
        os.signal(os.SIGQUIT, () => this.#cleanup(true));

        // 启动定时器
        this.#inprocessing = false
        this.#TimmerHandler();

        console.log(lang.SvrControl.initSuccess, os.getpid());
        return 0;
    }

    /**
     * 内部函数：启动定时器
     * @returns {number} - 0 为成功，其他为错误代码
     */
    #startTimmer() {
        if (!this.#enabled || !this.#dataPath || this.#services.length === 0) return 0;
        const fd = os.setTimeout(() => this.#TimmerHandler(), this.#interval);
        if (!fd) return 4; // EINTR
        this.#timmer = fd;
        return 0;
    }

    /**
     * 内部函数：定时器处理函数
     */
    #TimmerHandler() {
        if (this.#inprocessing) return;
        if (!this.#enabled || !this.#dataPath || this.#services.length === 0) return;

        // 获取服务状态
        const svStatusRaw = exec('SYSTEMD_COLORS=0 systemctl list-units --type=service --no-legend --plain');
        // 解析服务状态
        const svStatus = svStatusRaw.trim().split('\n').reduce((acc, line) => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const [unit, load, active, sub, ...descParts] = parts;
                acc[unit] = {
                    load: load,
                    active: active,
                    sub: sub,
                    description: descParts.join(' ') // 将剩余部分重新组合成描述
                };
            }
            return acc;
        }, {});

        // 存储服务状态
        const data = {
            timestamp: Date.now(),
            services: this.#services.map(srv => ({
                name: srv,
                status: svStatus[srv] || {}
            }))
        }

        // 写入临时文件
        if (!writeFile(this.#tmpDir + '/service.json.tmp', JSON.stringify(data), 'w')) {
            console.warn(lang.public.writeFileErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SvrControl.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
        } else {
            this.#errorCount = 0; // 重置错误计数
        }
        // 替换文件
        os.rename(this.#tmpDir + '/service.json.tmp', this.#tmpDir + '/service.json');

        // 启动定时器
        const startErr = this.#startTimmer();
        if (startErr !== 0) {
            console.error(lang.public.startTimmerErr);
            this.#cleanup();
            std.exit(startErr);
        }
    }

    /**
     * 内部函数：文件变化处理函数
     * @param {number} errno - 文件变化错误代码 
     */
    #fileChangeHandler(errno) {
        if (this.#inprocessing) return;
        this.#inprocessing = true;

        // 控制文件监听错误
        if (errno !== 0) {
            console.warn(lang.SvrControl.readCtrlFileErr);
            this.#errorCount++;
            console.log(this.#errorCount)
            if (this.#errorCount > 10) {
                console.error(lang.SvrControl.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
            this.#inprocessing = false;
            return;
        }

        // 读取控制文件
        const fileContent = std.loadFile('/dev/shm/servicesControl');
        if (fileContent === null) {
            console.warn(lang.SvrControl.readCtrlFileErr);
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error(lang.SvrControl.errorCount);
                this.#cleanup();
                std.exit(5); // EIO
            }
            this.#inprocessing = false;
            return;
        }

        // 重置控制文件
        if (!writeFile('/dev/shm/servicesControl', '', 'w')) {
            console.error('SvrControl():', lang.public.mktempErr);
            this.#inprocessing = false;
            return 5; // EIO
        }

        // 合规性检查 (srvControl|time|service|todo)
        let isreturn = false;
        const contentStr = fileContent.trim();
        const parts = contentStr.split('|');
        if (parts.length !== SvrControl.#partLength || parts[0] !== 'srvControl') isreturn = true; // 开始字段检测
        const [_, timeStr, service, todo] = parts;
        const time = parseInt(timeStr, 10);
        if (isNaN(time) || time < 0) isreturn = true;
        if (Date.now() - time > 5000) isreturn = true; // 只处理5s内的命令
        if (!this.#services.includes(service)) isreturn = true; // 只处理配置中的服务
        if (!SvrControl.#alowAction.includes(todo)) isreturn = true; // 只处理三种命令
        if (isreturn) {
            this.#inprocessing = false;
            return;
        }

        // 执行命令
        const isok = this.#switchService(service, todo);
        console.log(isok ? lang.SvrControl.switchSuccess : lang.SvrControl.switchErr, `- Service: ${service}, Action: ${todo}`);

        if (isok) this.#errorCount = 0;
        this.#inprocessing = false;
    }

    /**
     * 内部函数：切换服务状态
     * @param {String} service - 服务名
     * @param {String} action - 要执行的操作
     * @returns {boolean} - 是否执行成功
     */
    #switchService(service, action) {
        if (!service || !action) return false;

        // 执行系统命令
        const cmd = `sudo systemctl ${action} ${service}`;
        const result = exec(cmd);

        return (result !== null)
    }

    /**
     * 内湖函数: 清理残留文件
     * @param {boolean} isexit - 是否退出并返回退出码0 
     */
    #cleanup(isexit = false) {
        console.log('SvrControl():', lang.public.cleanTip);
        this.#inprocessing = true;
        this.#enabled = false;
        this.#interval = -1;
        if (this.#timmer) os.clearTimeout(this.#timmer);
        os.remove('/dev/shm/servicesControl');
        os.remove(this.#tmpDir + '/service.json');
        os.remove(this.#tmpDir + '/service.json.tmp');
        os.remove(this.#dataPath + '/service.json');
        if (isexit) std.exit(0);
    }
}