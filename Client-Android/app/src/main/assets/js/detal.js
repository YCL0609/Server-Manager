let id = null;
let errorId = null;
let isUpdating = false;
const crypt = new JSEncrypt();
const cache = { sysRes: '', srvRes: '' };
const config = {
    serverURL: '',
    controlURL: '',
    interval: 99999,
    memKeys: {
        MemTotal: "Total", MemAvailable: "Available", AnonPages: "App(Anon)",
        Cached: "Cached", Buffers: "Buffers", SReclaimable: "SReclaim",
        SwapTotal: "Swap Total", SwapFree: "Swap Free", Dirty: "Dirty",
        Committed_AS: "Committed"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const listRaw = appBridge.readFile('list.json', 'err');
    if (listRaw === 'err') return showMessage('无法读取本地数据', 'error');
    const serverList = JSON.parse(listRaw);
    const params = new URLSearchParams(window.location.search);
    id = params.get('id');
    if (!serverList[id]) return showMessage('本地数据格式错误', 'error')
    config.serverURL = serverList[id].data;
    config.controlURL = serverList[id].api;
    config.interval = serverList[id].interval
})

document.addEventListener('DOMContentLoaded', () => {
    updateData();
    setInterval(updateData, config.interval);
});

// 更新主函数
async function updateData() {
    if (isUpdating) return;
    isUpdating = true;

    try {
        const [sysRes, srvRes] = await Promise.all([
            fetch(config.serverURL + 'system.json').then(netProcess),
            fetch(config.serverURL + 'service.json').then(netProcess)
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

        if (errorId !== null) {
            closeMessage(errorId);
            errorId = null;
        }
        showError = true;
    } catch (e) {
        if (errorId !== null) errorId = showMessage('服务器连接错误\n' + e.message, 'error');
    } finally {
        isUpdating = false;
    }

    async function netProcess(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        try {
            return await response.json();
        } catch (e) {
            throw new Error('Json file format error');
        }
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
    const textE = document.getElementById('mem-usage-text');
    if (textE) textE.innerText = `${usedPercent}% Used`;

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
    if (button) button.disabled = true;

    try {
        const token = getToken(appBridge.readSecureFile(id + '.pem'));
        if (!token) throw new Error("Token 加密失败，请检查密钥文件!");

        const fd = new FormData();
        fd.append('service', service);
        fd.append('action', action);

        const res = await fetch(config.controlURL, {
            method: 'POST',
            headers: { 'token': token },
            body: fd
        });

        if (res.ok || res.status === 202) {
            showMessage('指令发送成功', 'info');
            // 延迟 1 秒刷新数据
            setTimeout(updateData, 1000);
        } else {
            showMessage(`操作失败: ${res.status} ${res.statusText}`, 'error');
        }
    } catch (err) {
        showMessage('错误: ' + err.message, 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

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
        return null;
    }
}