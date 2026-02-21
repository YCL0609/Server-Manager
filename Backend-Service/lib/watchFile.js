import * as os from 'qjs:os';

/**
 * 监控指定文件的变化 (增强健壮版)
 * @param {string} filename - 要监控的文件路径
 * @param {(errno: number) => void} callback - 回调函数
 * @param {number} [interval=1000] - 轮询间隔
 * @returns {{updateLastMtime: (m: number) => void}}
 */
export function watchFile(filename, callback, interval = 1000) {
    let lastMtime = 0;
    let isInitialized = false;

    // 尝试获取初始 mtime
    const [st, err] = os.stat(filename);
    if (err === 0) {
        lastMtime = st.mtime;
        isInitialized = true;
    }

    function check() {
        const [st, err] = os.stat(filename);

        if (err === 0) {
            if (isInitialized) {
                // 比较时间
                if (st.mtime !== lastMtime) {
                    lastMtime = st.mtime;
                    callback(0);
                }
            } else {
                // 触发回调并标记初始化
                lastMtime = st.mtime;
                isInitialized = true;
                callback(0);
            }
        } else {
            // 发生错误
            if (isInitialized) {
                isInitialized = false;
                callback(err);
            }
        }

        os.setTimeout(check, interval);
    }

    // 启动轮询
    os.setTimeout(check, interval);

    return {
        updateLastMtime: (newMtime) => {
            lastMtime = newMtime;
            isInitialized = true;
        }
    };
}