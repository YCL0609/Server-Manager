const server_URL = 'https://api.ycl.cool/tool/webnotepad/';
const crypt = new JSEncrypt();

document.addEventListener('DOMContentLoaded', () => setInterval(updateData, 3000));

async function updateData() {
    try {
        const [sysRes, srvRes] = await Promise.all([
            fetch('system.json'),
            fetch('service.json')
        ]);
        const sys = await sysRes.json();
        const srv = await srvRes.json();

        // 1. 更新 CPU 
        document.getElementById('load-1').innerText = sys.cpu[0];
        document.getElementById('load-5').innerText = sys.cpu[1];
        document.getElementById('load-15').innerText = sys.cpu[2];
        document.getElementById('load-tasks').innerText = sys.cpu[3];

        // 2. 更新内存
        const mem = sys.memory;
        const usedPercent = ((mem.MemTotal - mem.MemAvailable) / mem.MemTotal * 100).toFixed(1);
        document.getElementById('mem-usage-text').innerText = usedPercent + '% Used';

        const memKeys = {
            MemTotal: "Total", MemAvailable: "Available", AnonPages: "App(Anon)",
            Cached: "Cached", Buffers: "Buffers", SReclaimable: "SReclaim",
            SwapTotal: "Swap Total", SwapFree: "Swap Free", Dirty: "Dirty",
            Committed_AS: "Committed"
        };

        document.getElementById('mem-grid').innerHTML = Object.entries(memKeys).map(([key, label]) => `
                    <div class="bg-[#161b22] border border-gray-800 p-4 rounded-xl transition-colors hover:border-gray-600">
                        <span class="text-[10px] text-gray-500 uppercase block mb-1 font-semibold">${label}</span>
                        <span class="text-xl font-mono text-gray-100">${(mem[key] / 1024).toFixed(0)}<span class="text-xs ml-1 text-gray-600">MB</span></span>
                    </div>
                `).join('');

        // 3. 更新服务
        document.getElementById('service-grid').innerHTML = srv.services.map(s => {
            const active = s.status.active === 'active';
            return `
                        <div class="bg-[#161b22] border border-gray-800 p-4 rounded-xl flex flex-col justify-between shadow-lg">
                            <div class="flex justify-between items-start mb-4">
                                <div class="w-4/5">
                                    <h3 class="font-mono text-sm text-white font-bold truncate">${s.name}</h3>
                                    <p class="text-[10px] text-gray-500 mt-1 truncate">${s.status.description || ''}</p>
                                </div>
                                <span class="w-2.5 h-2.5 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-600'}"></span>
                            </div>
                            <div class="flex gap-2 mt-auto">
                                <button onclick="sendCmd('${s.name}', 'start', this)" ${active ? 'disabled' : ''} class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-green-700 disabled:opacity-10 transition-all">启动</button>
                                <button onclick="sendCmd('${s.name}', 'stop', this)" ${!active ? 'disabled' : ''} class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-red-700 disabled:opacity-10 transition-all">停止</button>
                                <button onclick="sendCmd('${s.name}', 'restart', this)" class="flex-1 text-[10px] font-bold py-2 rounded bg-[#1c2128] hover:bg-blue-700 transition-all">重启</button>
                            </div>
                        </div>
                    `;
        }).join('');
    } catch (e) { console.error("Update error"); }
}

async function sendCmd(service, action, button) {
    if (button) button.disabled = true; // 禁用按钮
    const fileInput = document.getElementById('token-file');
    const tokenFile = fileInput.files[0];
    if (!tokenFile) return alert("未选择操作令牌文件!");

    try {
        const RSAFile = await tokenFile.text();
        const fd = new FormData();
        fd.append('service', service);
        fd.append('action', action);

        const res = await fetch('index.php', {
            method: 'POST',
            headers: { 'token': GetToken(RSAFile) },
            body: fd
        });

        if (res.status === 202) {
            alert('操作成功: 等待服务器处理');
            updateData(); // 触发状态刷新
        } else {
            alert('操作失败: ' + res.status + ' ' + res.statusText);
        }
    } catch (err) {
        console.error(err.stack);
        alert('操作出错: ' + err.message);
    } finally {
        if (button) button.disabled = false; // 恢复按钮
    }
}

// token生成
function GetToken(key) {
    const now = Date.now();
    const offset = new Date().getTimezoneOffset() / -60;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tokenText = `{"time":{"date":${now},"zone":"${zone}","offset":${offset}},"random":"${RandomString()}"}`;
    crypt.setPublicKey(key);
    return crypt.encrypt(tokenText)
}