import * as os from 'qjs:os';
import * as std from 'qjs:std';
import { exec } from '../lib/runCmd.js';
import { lang, console, config, getLockFile } from '../lib/init.js';
const ctrlPipe = '/dev/shm/servicesControlPipe';

export class serviceControl {
    #services = [];
    #fileFd = null;
    #errorCount = 0;
    #monitorPID = 0;
    #inprocessing = false;

    constructor() {
        getLockFile('control.lock', 'serviceControl(): ');

        // 注册信号处理函数 (确保监听器处理和切换时可正常退出)
        os.signal(os.SIGINT, () => this.#cleanup(0));
        os.signal(os.SIGTERM, () => this.#cleanup(0));
        os.signal(os.SIGQUIT, () => this.#cleanup(0));

        // 加载配置
        const enabled = config.srvControl?.enable ?? false;
        this.#services = config.srvControl?.services ?? [];
        if (!enabled || this.#services.length === 0) std.exit(0);

        // 清理残留数据
        const [oldFiles, readErr] = os.lstat(ctrlPipe);
        if (readErr === 0) {
            if ((oldFiles.mode & os.S_IFMT) === os.S_IFDIR) {
                console.error('ServiceControl():', lang.public.isDirErr);
                std.exit(21); // EISDIR
            }
            if (os.remove(ctrlPipe) !== 0) {
                console.error('ServiceControl():', lang.public.removeErr);
                std.exit(5); // EIO
            }
        }

        // 创建命名管道
        const getPipe = exec(`mkfifo ${ctrlPipe}`);
        if (getPipe.exitCode !== 0) {
            console.error(lang.SvrControl.ctrlFileErr);
            std.exit(5); // EIO
        }

        // 设置权限
        const chmod = exec(`chmod 666 ${ctrlPipe}`);
        if (chmod.exitCode !== 0) {
            console.error(lang.SvrControl.ctrlFileErr);
            std.exit(5); // EIO
        }

        // 获取监控进程PID
        const pid = std.loadFile('/dev/shm/Server-Manager/service.lock');
        if (pid === null || pid < 0) {
            console.warn(lang.SvrControl.pidGetErr);
        } else if (os.kill(pid, 0) !== 0) {
            console.warn(lang.SvrControl.pidGetErr);
        } else {
            this.#monitorPID = pid;
        }

        // 启动异步监听循环
        this.#listenLoop();

        console.log(lang.SvrControl.initSuccess, os.getpid());
    }

    /**
     * 内部函数: 监听循环
     */
    #listenLoop() {
        // 以只读+非阻塞模式打开管道
        this.#fileFd = os.open(ctrlPipe, os.O_RDONLY | (os.O_NONBLOCK || 0x800));

        // 管道打开错误
        if (this.#fileFd < 0) {
            console.warn(lang.SvrControl.ctrlFileErr);

            // 错误计数
            this.#errorCount++;
            if (this.#errorCount > 10) {
                console.error('ServiceControl():', lang.public.errorCount);
                this.#cleanup(5); // EIO
            } else {
                // 1s后重试打开管道
                os.setTimeout(() => this.#listenLoop(), 1000);
                return;
            }
        }

        // 注册监听器
        os.setReadHandler(this.#fileFd, () => {
            // 创建缓冲区读取数据
            const bufArray = new Uint8Array(1024);
            const length = os.read(this.#fileFd, bufArray.buffer, 0, bufArray.length);

            if (length > 0) {
                // 将二进制转为字符串
                const content = String.fromCharCode.apply(null, bufArray.slice(0, length));

                // 获取第一行并处理
                const firstLine = content.split('\n').find(line => line.trim() !== "");
                if (firstLine) this.#processCommand(firstLine);
            } else if (length === 0) {
                // php关闭管道后重置监听器
                os.setReadHandler(this.#fileFd, null);
                os.close(this.#fileFd);
                this.#listenLoop();
            }
        });
    }

    /**
     * 内部函数: 检查指令字串是否合规 (合规则执行，否则提前返回)
     * @param {string} content - 要检查的指令字串
     */
    #processCommand(content) {
        if (this.#inprocessing) return;
        this.#inprocessing = true;
        const contentStr = content.trim().replace(';', ''); // 防止注入攻击
        const parts = contentStr.split('|');

        // 指令合规性检查
        if (parts.length !== 4 || parts[0] !== 'srvControl') return; // 长度和头部检查
        const [_, timeStr, service, todo] = parts;
        const time = parseInt(timeStr, 10);
        if (isNaN(time) || (Date.now() - time > 10000)) return; // 时间检查 (10s内)
        if (!this.#services.includes(service)) return; // 服务是否再配置文件中
        if (!['start', 'stop', 'restart'].includes(todo)) return; // 是否是允许的操作

        // 执行切换操作
        const isok = this.#switchService(service, todo);

        // 尝试向监控程序发送更新信号
        if (isok && this.#monitorPID > 0) os.kill(this.#monitorPID, os.SIGUSR1);

        // 提示信息输出
        const message = isok ? lang.SvrControl.switchSuccess : lang.SvrControl.switchErr;
        console.log(message, `- Service: ${service}, Action: ${todo}`);
        this.#inprocessing = false;
    }

    /**
     * 内部函数: 执行服务状态切换
     * @param {string} service - 要操作的服务
     * @param {string} action - 要执行的操作
     * @returns {boolean} - 是否成功执行
     */
    #switchService(service, action) {
        if (!service || !action) return false;
        const timeoutVal = (action === 'restart') ? '30' : '20';
        const cmd = `timeout ${timeoutVal} sudo systemctl ${action} ${service}`;
        const result = exec(cmd);

        // 操作超时
        if (result.exitCode === 124) {
            console.warn('ServiceControl():' + lang.public.timeout);
            return false;
        }

        // 异常退出
        if (result.exitCode !== 0) {
            console.error(lang.SvrControl.switchErr, ' - Code:', result.exitCode);
            return false;
        }
        return true;
    }

    /**
     * 内部函数: 清理残留文件
     * @param {number} [exitCode=0] - 要返回的退出码 (默认为0) 
     */
    #cleanup(exitCode = 0) {
        if (this.#fileFd >= 0) {
            os.setReadHandler(this.#fileFd, null);
            os.close(this.#fileFd);
        }
        os.remove('/dev/shm/Server-Manager/control.lock');
        os.remove(ctrlPipe);
        std.exit(exitCode);
    }
}