import * as os from 'qjs:os';
import { console, lang } from './init.js';
const SAFE_SEGMENT_RE = /^(?!^\.{1,2}$)[a-zA-Z0-9_\-\u4e00-\u9fa5][a-zA-Z0-9_\-\u4e00-\u9fa5.]*(?<!\.)$/;

/**
 * 对指定路径进行检查，确保路径存在且为目录
 * @param {String} path 要检查的路径
 * @returns {Number} 错误码，0表示成功，非0表示失败
 */
export function dirCheck(path) {
    if (path === undefined || path === null) return;
    const [detail, err] = os.stat(path);
    if (err !== 0) {
        const dirs = path.split('/');
        let currentPath = '';

        for (let i = 0; i < dirs.length; i++) {
            if (dirs[i] === '') continue;

            // 路径段合法性检查
            if (!isSegmentSafe(dirs[i])) {
                console.error(lang.dirCheck.illegalPath);
                return 14; // EFAULT
            }
            
            // 检查路径
            const newPath = currentPath + '/' + dirs[i];
            const [obj, errno] = os.stat(newPath);
            if (errno !== 0) {
                // 目录不存在，尝试创建
                if (os.mkdir(newPath, 0o755) !== 0) {
                    console.error(lang.dirCheck.errNewDir, newPath);
                    return 5; // EIO
                }
                currentPath = newPath;
            } else if ((obj.mode & os.S_IFMT) !== os.S_IFDIR) {
                // 路径存在但不是目录
                console.error(lang.dirCheck.fileExist, newPath);
                return 17; // EEXIST
            } else {
                currentPath = newPath;
            }
        }
        return 0; // 成功创建目录
    } else if ((detail.mode & os.S_IFMT) !== os.S_IFDIR) {
        // 路径存在但不是目录
        console.error(lang.dirCheck.fileExist, path);
        return 17; // EEXIST
    } else {
        // 目录已存在，无需操作
        return 0;
    }
}

/**
 * 检查路径段是否合法
 * @param {String} segment 需要检查的路径段
 * @returns {Boolean} 是否合法
 */
function isSegmentSafe(segment) {
    // 基础长度限制
    if (!segment || segment.length > 255) return false;

    // 拦截控制字符
    if (/[\x00-\x1F\x7F]/.test(segment)) return false;

    // 正则白名单校验
    return SAFE_SEGMENT_RE.test(segment);
}