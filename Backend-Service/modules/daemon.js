import * as std from 'qjs:std';
import * as os from 'qjs:os';
import { lang, console } from '../libs/init.js';
import { getLockFile } from '../libs/getLockFile.js';
import { exec } from '../libs/runCmd.js';
export const version = '0.7'; // 程序版本

export class Daemon {
    #childPids = [];
    /** 子进程参数列表 */
    static tasks = [
        [...scriptArgs, '--sysmon'],
        [...scriptArgs, '--svrmon'],
        [...scriptArgs, '--svrctrl'],
    ];

    constructor() {
        getLockFile('main.lock', '');
        console.log(lang.init.initSuccess, os.getpid())

        // 监听中断信号
        os.signal(os.SIGINT, () => this.#cleanup());
        os.signal(os.SIGTERM, () => this.#cleanup());
        os.signal(os.SIGQUIT, () => this.#cleanup());

        // 启动所有子进程
        Daemon.tasks.forEach(args => {
            const pid = os.exec(args, { block: false });
            if (pid >= 0) this.#childPids.push(pid);
        });

        // 子进程数量判断
        let count = this.#childPids.length;
        if (count !== Daemon.tasks.length) console.warn(lang.init.childProcessErr, `(${count}/${tasks.length})`);

        // 等待所有子进程结束
        while (count > 0) {
            const [retPid, status] = os.waitpid(-1, 0);
            if (retPid > 0) {
                count--;
                // 从追踪列表中移除
                const idx = this.#childPids.indexOf(retPid);
                if (idx > -1) this.#childPids.splice(idx, 1);
                if ((status >> 8) !== 0) console.warn(lang.init.childProcExit, `- PID: ${retPid}, Code: ${status >> 8}`);
            } else {
                // 如果 waitpid 被信号中断，检查 count 并在循环中继续
                if (count <= 0) break;
            }
        }

        this.#cleanup();
    }

    #cleanup() {
        console.log(lang.public.cleanTip);

        // 终止子进程
        this.#childPids.forEach(pid => {
            try {
                os.kill(pid, os.SIGTERM);
            } catch (_) { }
        });

        // 等待所有子进程退出
        while (this.#childPids.length > 0) {
            const [retPid, _] = os.waitpid(-1, 0);
            if (retPid > 0) {
                const idx = this.#childPids.indexOf(retPid);
                if (idx > -1) this.#childPids.splice(idx, 1);
            } else {
                break;
            }
        }

        // 清理临时文件
        exec('rm -f /run/server-manager/*.lock');
        os.remove('/run/server-manager/servicesControlPipe');
        exec('rm -f /dev/shm/Server-Manager/*.json');
        std.exit(0);
    }
}