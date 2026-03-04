function showMessage(message, level, callback) {
    if (!message) return;
    // 获取或创建消息容器
    let container = document.querySelector('.notes-container');
    if (!container) {
        container = document.createElement('div');
        container.classList.add('notes-container');
        document.body.appendChild(container);
    }
    // 根据级别设置样式
    let levelClass;
    switch (level) {
        case 'success':
            levelClass = 'success';
            break;
        case 'warning':
            levelClass = 'warning';
            break;
        case 'error':
            levelClass = 'error';
            break;
        case 'info':
            levelClass = 'info';
            break;
        default:
            levelClass = 'info';
    }

    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `note note-${levelClass}`;
    messageDiv.id = 'note-' + RandomString();
    messageDiv.innerText = message;

    // 点击消息时移除
    messageDiv.addEventListener('click', () => {
        messageDiv.parentNode.removeChild(messageDiv);
        if (typeof callback === 'function') callback();
    });

    // 延时移除
    if (level !== 'error') {
        setTimeout(() => messageDiv.parentNode.removeChild(messageDiv), 3000);
        if (typeof callback === 'function') callback();
    }

    container.appendChild(messageDiv);
    return messageDiv.id;
}

function closeMessage(id) {
    if (!id) return;
    const noteDiv = document.getElementById(id);
    const container = document.querySelector('.notes-container');
    if (noteDiv) container.removeChild(noteDiv);
}

function RandomString(length = 32) {
    const chatr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const result = new Array(length);
    for (let i = 0; i < length; i++) result[i] = chatr.charAt(Math.floor(Math.random() * chatr.length));
    return result.join('');
}