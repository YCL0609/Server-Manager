let isUpdating = false;
let showError = true;
let errorId = '';
let lang = (navigator.language || navigator.userLanguage).slice(0, 2);
const crypt = new JSEncrypt();
const cache = { sysRes: '', srvRes: '' };
const config = {
    serverURL: './data/',
    controlURL: './control/index.php',
    interval: 60000,
    memKeys: {
        MemTotal: "Total", MemAvailable: "Available", AnonPages: "App(Anon)",
        Cached: "Cached", Buffers: "Buffers", SReclaimable: "SReclaim",
        SwapTotal: "Swap Total", SwapFree: "Swap Free", Dirty: "Dirty",
        Committed_AS: "Committed"
    }
};
const langRaw = {
    list: [
        'zh',
        'en'
    ],
    zh: {
        cpuTip: 'CPU 负载',
        min1: '1 分钟内',
        min5: '5 分钟内',
        min15: '15 分钟内',
        mem: '内存负载',
        controlTip: '服务控制',
        token: '操作令牌:',
        error: {
            connect: '无法连接服务器',
            noToken: '请选择令牌文件',
            tokenErr: 'Token 加密失败，请检查令牌文件!',
            success: '指令发送成功'
        }
    },
    en: {
        cpuTip: 'CPU Load',
        min1: '1 minute',
        min5: '5 minutes',
        min15: '15 minutes',
        mem: 'Memory Load',
        controlTip: 'Service Control',
        token: 'Operation Token:',
        error: {
            connect: 'Unable to connect to the server',
            noToken: 'Please select a token file',
            tokenErr: 'Token encryption failed, please check the token file!',
            success: 'Command sent successfully'
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 页面语言切换
    lang = langRaw.list.includes(lang) ? lang : 'en';
    if (langRaw.list.includes(lang) && lang !== 'zh') {
        document.querySelectorAll('[data-langId]').forEach(e => e.innerText = langRaw[lang][e.dataset.langid]);
    }

    //数据更新
    updateData();
    setInterval(updateData, config.interval);
});

// 更新主函数
async function updateData() {
    if (isUpdating) return;
    isUpdating = true;

    try {
        const [sysRes, srvRes] = await Promise.all([
            fetch(config.serverURL + 'system.json').then(r => r.json()),
            fetch(config.serverURL + 'service.json').then(r => r.json())
        ]);

        // 缓存判断
        if (cache.sysRes !== sysRes) {
            renderCPU(sysRes.cpu);
            renderMemory(sysRes.memory);
            cache.sysRes = sysRes;
        }
        if (cache.srvRes !== srvRes) {
            renderServices(srvRes.services);
            cache.srvRes = srvRes;
        }

        // 清理提示信息
        closeMessage(errorId);
        showError = true;
    } catch (e) {
        console.error('Update error:', e);
        if (showError) errorId = showMessage(langRaw[lang].error.connect, 'error');
        showError = false;
    } finally {
        isUpdating = false;
    }
}

// 渲染CPU信息
function renderCPU(cpu) {
    const ids = ['load-1', 'load-5', 'load-15', 'load-tasks'];
    cpu.forEach((item, index) => {
        const element = document.getElementById(ids[index]);
        if (element && element.innerText !== item) element.innerText = item;
    });
}

// 渲染内存信息
function renderMemory(mem) {
    const usedPercent = ((mem.MemTotal - mem.MemAvailable) / mem.MemTotal * 100).toFixed(1);
    const textEl = document.getElementById('mem-usage-text');
    if (textEl) textEl.innerText = `${usedPercent}% Used`;

    const gridHtml = Object.entries(config.memKeys).map(([key, label]) => `
        <div class="bg-[#161b22] border border-gray-800 p-4 rounded-xl transition-colors hover:border-gray-600">
            <span class="text-[10px] text-gray-500 uppercase block mb-1 font-semibold">${label}</span>
            <span class="text-xl font-mono text-gray-100">
                ${(mem[key] / 1024).toFixed(0)}<span class="text-xs ml-1 text-gray-600">MB</span>
            </span>
        </div>
    `).join('');
    document.getElementById('mem-grid').innerHTML = gridHtml;
}

// 渲染服务列表
function renderServices(services) {
    const newHtml = services.map(item => {
        const active = item.status.active === 'active';
        return `
            <div class="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex flex-col justify-between shadow-lg">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-4/5">
                        <h3 class="font-mono text-sm text-white font-bold truncate">${item.name}</h3>
                        <p class="text-[10px] text-gray-500 mt-1 truncate">${item.status.description || ''}</p>
                    </div>
                    <span class="w-2.5 h-2.5 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-600'}"></span>
                </div>
                <div class="flex gap-2 mt-auto">
                    <button onclick="sendCmd('${item.name}', 'start', this)" ${active ? 'disabled' : ''} class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-green-700 disabled:opacity-10 transition-all">启动</button>
                    <button onclick="sendCmd('${item.name}', 'stop', this)" ${active ? '' : 'disabled'} class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-red-700 disabled:opacity-10 transition-all">停止</button>
                    <button onclick="sendCmd('${item.name}', 'restart', this)" class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-blue-700 disabled:opacity-10 transition-all">重启</button>
                </div>
            </div>`;
    }).join('');
    document.getElementById('service-grid').innerHTML = newHtml;
}


// 命令发送
async function sendCmd(service, action, button) {
    const fileInput = document.getElementById('token-file');
    const tokenFile = fileInput.files[0];

    if (!tokenFile) return showMessage(langRaw[lang].error.noToken, 'warning');
    if (button) button.disabled = true;

    try {
        const RSAKey = await tokenFile.text();
        const token = getToken(RSAKey);
        if (!token) throw new Error(langRaw[lang].error.tokenErr);

        const fd = new FormData();
        fd.append('service', service);
        fd.append('action', action);

        const res = await fetch(config.controlURL, {
            method: 'POST',
            headers: { 'token': token },
            body: fd
        });

        if (res.ok || res.status === 202) {
            showMessage(langRaw[lang].error.success, 'info');
            // 延迟 2 秒刷新数据
            setTimeout(updateData, 2000);
        } else {
            showMessage('HTTP ' + res.status + res.statusText, 'error');
        }
    } catch (err) {
        showMessage('Error: ' + err.message, 'error');
        console.error(err);
    } finally {
        if (button) button.disabled = false;
    }
}

// Token 生成
function getToken(key) {
    try {
        const now = Date.now();
        const offset = new Date().getTimezoneOffset() / -60;
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const tokenText = JSON.stringify({
            time: { date: now, zone: zone, offset: offset },
            random: RandomString()
        });

        crypt.setPublicKey(key);
        return crypt.encrypt(tokenText);
    } catch (e) {
        console.error('Encryption failed: ' + e);
        return null;
    }
}