import * as os from 'qjs:os';
import { console, lang } from './init.js';
const SAFE_SEGMENT_RE = /^(?!^\.{1,2}$)[a-zA-Z0-9_\-\.\u4e00-\u9fa5]+$/;

/**
 * 对指定路径进行检查，确保路径存在且为目录
 * @param {String} path 要检查的路径
 * @returns {Number} 错误码，0表示成功，非0表示失败
 */
export function dirCheck(path) {
    if (path === undefined || path === null || path === '') return 0;

    // 获取路径信息
    const [detail, err] = os.stat(path);

    // 如果路径存在
    if (err === 0) {
        if ((detail.mode & os.S_IFMT) !== os.S_IFDIR) {
            console.error(lang.dirCheck.fileExist, path);
            return 17; // EEXIST
        }
        return 0;
    }

    const isAbsolute = path.startsWith('/');
    const segments = path.split('/').filter(s => s.length > 0);
    let currentPath = isAbsolute ? '' : '.';

    for (const segment of segments) {
        // 合法性检查
        if (!isSegmentSafe(segment)) {
            console.error(`${lang.dirCheck.illegalPath}: "${segment}"`);
            return 14; // EFAULT
        }

        currentPath += '/' + segment;

        // 检查当前路径是否存在
        const [obj, errno] = os.stat(currentPath);
        if (errno !== 0) {
            // 目录不存在，尝试创建
            if (os.mkdir(currentPath, 0o755) !== 0) {
                console.error(lang.dirCheck.errNewDir, currentPath);
                return 5; // EIO
            }
        } else if ((obj.mode & os.S_IFMT) !== os.S_IFDIR) {
            // 中间层级是个文件
            console.error(lang.dirCheck.fileExist, currentPath);
            return 17; // EEXIST
        }
    }

    return 0;
}

/**
 * 检查路径段是否合法
 * @param {String} segment 需要检查的路径段
 * @returns {Boolean} 是否合法
 */
function isSegmentSafe(segment) {
    // 长度限制
    if (!segment || segment.length > 255) return false;

    // 拦截控制字符
    if (/[\x00-\x1F\x7F]/.test(segment)) return false;

    // 正则校验
    return SAFE_SEGMENT_RE.test(segment);
}