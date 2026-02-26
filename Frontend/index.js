const crypt = new JSEncrypt();
let isUpdating = false;
const cache = { sysRes: '', srvRes: '' };
const config = {
    serverURL: 'http://192.168.232.130/data/',
    controlPath: 'http://192.168.232.130/control/index.php',
    interval: 3000,
    memKeys: {
        MemTotal: "Total", MemAvailable: "Available", AnonPages: "App(Anon)",
        Cached: "Cached", Buffers: "Buffers", SReclaimable: "SReclaim",
        SwapTotal: "Swap Total", SwapFree: "Swap Free", Dirty: "Dirty",
        Committed_AS: "Committed"
    }
};


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
            fetch(config.serverURL + 'system.json').then(r => r.json()),
            fetch(config.serverURL + 'service.json').then(r => r.json())
        ]);

        if (cache.sysRes !== sysRes) {
            renderCPU(sysRes.cpu);
            renderMemory(sysRes.memory);
            cache.sysRes = sysRes;
        }
        if (cache.srvRes !== srvRes) {
            renderServices(srvRes.services);
            cache.srvRes = srvRes;
        }
    } catch (e) {
        console.error("Update error:", e);
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

    if (!tokenFile) {
        alert("未选择操作令牌文件!");
        return;
    }
    if (button) button.disabled = true;

    try {
        const RSAKey = await tokenFile.text();
        const token = getToken(RSAKey);
        if (!token) throw new Error("Token 加密失败，请检查 RSA 密钥格式。");

        const fd = new FormData();
        fd.append('service', service);
        fd.append('action', action);

        const res = await fetch(config.controlPath, {
            method: 'POST',
            headers: { 'token': token },
            body: fd
        });

        if (res.ok || res.status === 202) {
            // 操作成功后延迟 1 秒刷新数据，给服务端留出状态变更时间
            setTimeout(updateData, 1000);
        } else {
            alert(`操作失败: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        alert('错误: ' + err.message);
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
