import * as os from 'qjs:os';

/**
 * 监控指定文件的变化
 * @function watchFile
 * @param {string} filename - 要监控的文件路径。
 * @param {(errno: number) => void} callback 
 *   回调函数，在文件发生变化或出现错误时触发。
 *   - errno === 0：文件正常变化
 *   - errno !== 0：文件状态异常
 * @param {number} [interval=1000] - 轮询间隔（毫秒）。
 */
export function watchFile(filename, callback, interval = 1000) {
    // 获取初始状态
    let [st, err] = os.stat(filename);
    if (err !== 0) throw new Error('Initialization error - code ' + err);

    let lastMtime = st.mtime;

    function check() {
        let [st, err] = os.stat(filename);
        if (err === 0) {
            // 比较修改时间
            if (st.mtime !== lastMtime) {
                lastMtime = st.mtime;
                callback(err);
            }
        } else {
            // 发生错误
            callback(err);
        }
        // 循环调用
        os.setTimeout(check, interval);
    }

    os.setTimeout(check, interval);
}
