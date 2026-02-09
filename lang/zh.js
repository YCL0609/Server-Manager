export default {
    init: {
        childProcExitErr: '子进程异常退出',
        inrunning: '已有实例在运行中，程序退出',
        childProcessErr: '初始化错误: 一个或多个子进程启动失败',
        lockFileErr: '初始化错误: 无法获取锁文件',
        statErr: '初始化错误: 无法获取配置文件属性信息 - Code',
        fileModeErr: '初始化错误: 请确保配置文件的所有者是 root 且权限设置为 644(-rw-r--r--)',
        readErr: '初始化错误: 无法读取配置文件',
        parseErr: '初始化错误: 配置文件不合规',
    },
    dirCheck: {
        illegalPath: 'dirCheck(): 检测到非法路径段! 函数提前返回',
        errNewDir: 'dirCheck(): 无法创建目录',
        fileExist: 'dirCheck(): 路径已存在且不是目录! 函数提前返回 - 路径:',
    },
    SysMonitor:{
        initSuccess: '系统监控模块启动成功',
        initErr: 'SysMonitor(): 初始化错误: 数据目录检查失败 - Code',
        isDirErr: 'SysMonitor(): 数据文件路径指向一个目录而非文件!',
        mktempErr: 'SysMonitor(): 无法创建临时文件!',
        symlinkErr: 'SysMonitor(): 无法创建符号链接!',
        startTimmerErr: 'SysMonitor(): 无法启动定时器!',
        removeErr: 'SysMonitor(): 无法删除临时数据文件 - Code',
        readInfoErr: 'SysMonitor(): 无法读取系统状态信息!',
        errorCount: 'SysMonitor(): 连续失败超过 10 次，自动终止系统监控功能!',
        writeFileErr: 'SysMonitor(): 无法写入数据文件!',
    }
}