let selectedCard = null;
let serverList = {};
let lang = (navigator.language || navigator.userLanguage).slice(0, 2);
const langRaw = {
    list: [
        'zh',
        'en'
    ],
    zh: {
        title: '服务器列表',
        name: '服务器别名:',
        url1: '数据URL路径:',
        url2: 'API URL路径:',
        interval: '刷新间隔 (单位: ms):',
        token: '选择令牌文件:',
        add: '添加',
        del: '删除',
        error: {
            table: '请完成表格',
            tokenErr: '无法读取令牌文件',
            success: '指令发送成功',
            save: '无法保存更改到本地',
            data: '本地数据格式错误'
        }
    },
    en: {
        title: 'Server List',
        name: 'Server Alias:',
        url1: 'Data URL Path:',
        url2: 'API URL Path:',
        interval: 'Refresh Interval (ms):',
        token: 'Select Token File:',
        add: 'Add',
        del: 'Delete',
        error: {
            table: 'Please complete the form',
            tokenErr: 'Unable to read token file',
            success: 'Command sent successfully',
            save: 'Unable to save changes locally',
            data: 'Local data format error'
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 页面语言切换
    lang = langRaw.list.includes(lang) ? lang : 'en';
    if (langRaw.list.includes(lang) && lang !== 'zh') {
        document.querySelectorAll('[data-langId]').forEach(e => e.innerText = langRaw[lang][e.dataset.langid]);
    }

    // 获取数据
    try {
        const listRaw = appBridge.readFile('list.json', '{}').trim();
        serverList = JSON.parse(listRaw);
        for (const id in serverList) addCard(id, serverList[id].name ?? 'Unnamed');
    } catch (_) {
        showMessage(langRaw[lang].error.data, 'error');
    }
})

function switchCard() {
    const section = document.getElementById('inputSection');
    section.style.display = (section.style.display === 'block') ? 'none' : 'block';
}

document.querySelector('.btn-add').addEventListener('click', switchCard);

document.querySelector('.btn-confirm').addEventListener('click', async () => {
    const name = document.getElementById('name');
    const dataUrlRaw = document.getElementById('dataUrl');
    const apiUrl = document.getElementById('apiUrl');
    const interval = document.getElementById('interval');
    const tokenFile = document.getElementById('tokenFile');

    // 合规性检查
    if (!name.value ||
        !dataUrlRaw.value ||
        !apiUrl.value ||
        !interval.value ||
        tokenFile.files.length === 0) {
        return showMessage(langRaw[lang].error.table, 'warning');
    }

    // 预处理数据
    const id = Date.now();
    const dataUrl = (dataUrlRaw.value.slice(-1) === '/') ? dataUrlRaw.value : dataUrlRaw.value + '/';
    let token;
    try {
        token = await tokenFile.files[0].text();
    } catch (e) {
        return showMessage(langRaw[lang].error.tokenErr, 'error');
    }

    // 添加到页面
    addCard(id, name.value);

    // 保存配置
    let newList = serverList;
    newList[id] = {
        name: name.value,
        data: dataUrl,
        api: apiUrl.value,
        interval: interval.value
    };
    if (appBridge.saveSecureFile(id + '.pem', token) === 0 &&
        appBridge.saveFile('list.json', JSON.stringify(newList))) {
        serverList = newList;
        selectedCard = null;
    } else showMessage(langRaw[lang].error.save, 'error');

    switchCard();
})

document.querySelector('.btn-del').addEventListener('click', () => {
    let newList = serverList;
    const id = selectedCard.dataset.id;
    if (newList[id]) delete newList[id];
    if (appBridge.saveFile('list.json', newList)) {
        selectedCard.remove();
        serverList = newList;
        selectedCard = null;
        appBridge.deleteFile(id + '.pem');
    } else showMessage(langRaw[lang].error.save, 'warning');
})

function addCard(id, name) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = id;
    card.innerHTML = `<div class="card-name">${name}</div>`;
    card.onclick = () => {
        // 点击已经选中卡片
        if (selectedCard === card) location.href = './detal.html?id=' + id;

        // 有选中的, 但点击了另一个
        if (selectedCard) selectedCard.classList.remove('selected');
        card.classList.add('selected');
        selectedCard = card;
    };
    document.getElementById('cardList').prepend(card);
}