import * as os from 'qjs:os';
import { console, lang } from './init.js';
const SAFE_SEGMENT_RE = /^[a-zA-Z0-9_\-\.\u4e00-\u9fa5]+$/;

/**
 * 对指定路径进行检查，确保路径存在且为目录
 * @param {String} path 要检查的路径
 * @returns {Number} 错误码，0表示成功，非0表示失败
 */
export function dirCheck(path) {
    if (path === undefined || path === null || path === '') return 0;

    // 规范化路径
    const isAbsolute = path.startsWith('/');
    const segments = path.split('/').filter(s => s.length > 0);
    
    // 预检查路径是否存在
    const [detail, err] = os.stat(path);
    if (err === 0) {
        if ((detail.mode & os.S_IFMT) !== os.S_IFDIR) {
            console.error(lang.dirCheck.fileExist, path);
            return 17; // EEXIST
        }
        return 0;
    }

    // 逐级递归检查/创建
    let currentPath = isAbsolute ? '' : '.';

    for (const segment of segments) {
        // 合法性检查
        if (!isSegmentSafe(segment)) {
            console.error(`${lang.dirCheck.illegalPath}: "${segment}"`);
            return 14; // EFAULT
        }

        currentPath += '/' + segment;

        // 检查当前层级
        const [obj, errno] = os.stat(currentPath);
        if (errno !== 0) {
            // 目录不存在，尝试创建
            if (os.mkdir(currentPath, 0o755) !== 0) {
                console.error(lang.dirCheck.errNewDir, currentPath);
                return 5; // EIO
            }
        } else if ((obj.mode & os.S_IFMT) !== os.S_IFDIR) {
            // 发现同名文件阻碍目录创建
            console.error(lang.dirCheck.fileExist, currentPath);
            return 17; // EEXIST
        }
    }

    return 0;
}

function isSegmentSafe(segment) {
    if (!segment || segment.length > 255) return false;
    // 拦截路径穿越
    if (segment === '.' || segment === '..') return false;
    if (/[\x00-\x1F\x7F]/.test(segment)) return false;
    return SAFE_SEGMENT_RE.test(segment);
}