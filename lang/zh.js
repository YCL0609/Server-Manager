export default {
    init: {
        statErr: '初始化错误: 无法获取配置文件属性信息 - Code',
        fileModeErr: '初始化错误: 请确保配置文件的所有者是 root 且权限设置为 644(-rw-r--r--)',
        readErr: '初始化错误: 无法读取配置文件',
        parseErr: '初始化错误: 配置文件不合规',
    },
    dirCheck: {
        illegalPath: 'dirCheck(): 检测到非法路径段! 函数提前返回',
        errNewDir: 'dirCheck(): 无法创建目录',
        fileExist: 'dirCheck(): 路径已存在且不是目录! 函数提前返回 - 路径:',
    }
}