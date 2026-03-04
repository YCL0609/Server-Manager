import * as std from 'qjs:std';

/**
 * 执行系统命令并获取结果与退出状态码
 * @param {string} cmd - 完整的命令行字符串
 * @returns {{output: string, exitCode: number} | null} - 失败返回 null
 */
export function exec(cmd) {
    const pipe = std.popen(`${cmd} 2>&1`, 'r');
    if (!pipe) return null;

    const output = pipe.readAsString();
    
    // pipe.close() 在 QuickJS 中返回的是进程退出状态码
    // 通常是一个 16 位整数，高 8 位是真正的 exit code
    const rawStatus = pipe.close();
    const exitCode = (rawStatus >> 8) & 0xFF;

    return {
        output: output ? output.trim() : '',
        exitCode: exitCode
    };
}