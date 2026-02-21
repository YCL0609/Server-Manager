import * as std from 'qjs:std';

/**
 * 写入文件函数
 * @param {string} filename 文件路径
 * @param {string} content 内容
 * @param {'a'|'w'} mode 模式：'a' 为追加, 'w' 为覆盖，默认为 'a'
 * @return {boolean} 操作是否成功
 */
export function writeFile(filename, content, mode = 'a') {
    const f = std.open(filename, mode);
    if (!f) return false;

    f.puts(content);
    f.flush(); // 强制将缓冲区内容写入磁盘
    f.close();
    return true;
}