import * as std from 'qjs:std';

/**
 * 执行命令并获取字符串结果
 * @param {string} cmd - 完整的命令行字符串
 * @returns {string|null} - 返回输出内容，失败返回 null
 */
export function exec(cmd) {
    const pipe = std.popen(cmd, 'r');
    if (!pipe) return null;
    const output = pipe.readAsString();
    pipe.close();
    return output;
}