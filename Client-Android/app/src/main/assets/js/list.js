let selectedCard = null;
let serverList = {};

document.addEventListener('DOMContentLoaded', () => {
    const listRaw = appBridge.readFile('list.json', '{}').trim();
    serverList = JSON.parse(listRaw);
    for (const id in serverList) addCard(id, serverList[id].name ?? 'Unnamed');
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
        return showMessage('请完成表格', 'warning');
    }

    // 预处理数据
    const id = Date.now();
    const dataUrl = (dataUrlRaw.value.slice(-1) === '/') ? dataUrlRaw.value : dataUrlRaw.value + '/';
    let token;
    try {
        token = await tokenFile.files[0].text();
    } catch (e) {
        return showMessage('无读取令牌文件', 'error');
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
    } else showMessage('无法保存更改到本地', 'error');

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
    } else showMessage('无法保存更改到本地', 'warning');
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