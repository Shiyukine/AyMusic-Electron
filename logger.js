var { app } = require("electron")
var fs = require("fs")

var configLogs = { write: true }
const logPath = app.getPath("appData") + "\\AyMusic\\latest.log"

const addLogs = (level, message, line, sourceId) => {
    fs.appendFile(logPath, "[" + ['debug', 'info', 'warn', 'error'][level] + " @ " + sourceId + ":" + line + "] " + message + "\n", (error) => {
        if (error) console.error(error)
    })
}

const initLogs = () => {
    fs.appendFileSync(logPath, "")
    fs.writeFile(logPath, "", (error) => {
        if (error) console.error(error)
    })
}

module.exports.addLogs = addLogs;
module.exports.initLogs = initLogs;
module.exports.configLogs = configLogs;