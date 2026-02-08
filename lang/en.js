export default {
    init: {
        statErr: 'Initialization Error: Unable to retrieve profile attribute information - Code',
        fileModeErr: 'Initialization Error: Please ensure that the configuration file is owned by root and has permissions set to 644(-rw-r--r--).',
        readErr: 'Initialization Error: Unable to read config file',
        parseErr: 'Initialization Error: The configuration file is non-compliant',
    },
    dirCheck: {
        illegalPath: 'dirCheck(): Illegal path segment detected! Function returns early.',
        errNewDir: 'dirCheck(): Unable to create directory',
        fileExist: 'dirCheck(): Path already exists and is not a directory! Function returns early. Path:',
    }
}