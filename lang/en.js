export default {
    init: {
        childProcExitErr: 'Child process exited with an error',
        inrunning: 'An instance is already running, exiting program',
        childProcessErr: 'Initialization error: one or more child processes failed to start',
        lockFileErr: 'Initialization error: Unable to acquire lock file',
        statErr: 'Initialization Error: Unable to retrieve profile attribute information - Code',
        fileModeErr: 'Initialization Error: Please ensure that the configuration file is owned by root and has permissions set to 644(-rw-r--r--).',
        readErr: 'Initialization Error: Unable to read config file',
        parseErr: 'Initialization Error: The configuration file is non-compliant',
    },
    dirCheck: {
        illegalPath: 'dirCheck(): Illegal path segment detected! Function returns early.',
        errNewDir: 'dirCheck(): Unable to create directory',
        fileExist: 'dirCheck(): Path already exists and is not a directory! Function returns early. Path:',
    },
    SysMonitor:{
        initSuccess: 'SysMonitor started successfully',
        initErr: 'SysMonitor(): Initialization error: Data directory check failed - Code',
        removeErr: 'SysMonitor(): Unable to remove old data file!',
        isDirErr: 'SysMonitor(): Data file path points to a directory instead of a file!',
        mktempErr: 'SysMonitor(): Unable to create temporary file!',
        symlinkErr: 'SysMonitor(): Unable to create symbolic link!',
        startTimmerErr: 'SysMonitor(): Unable to start timer!',
        removeErr: 'SysMonitor(): Unable to remove temporary data file - Code',
        readInfoErr: 'SysMonitor(): Unable to read system status information!',
        errorCount: 'SysMonitor(): More than 10 consecutive failures, automatically terminating system monitoring function!',
        writeFileErr: 'SysMonitor(): Unable to write data file!',
    }
}