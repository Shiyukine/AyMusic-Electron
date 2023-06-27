const { app, components, BrowserWindow, session, protocol, net, ipcMain, dialog } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { servUrl, searchUpdates } = require("./update.js")

var codeInjecter = []

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

const callBoundObject = () => {
    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.setIgnoreMouseEvents(ignore, options)
    })

    ipcMain.on('close-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.close()
    })

    ipcMain.on('change-serv', (event, args, options) => {
        servUrl = args
    })

    ipcMain.on('minimize-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.minimize()
    })

    ipcMain.on('max-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.maximize()
    })

    ipcMain.on('restore-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.restore()
    })

    ipcMain.on('get-state-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        event.returnValue = win.isMaximized()
    })

    ipcMain.on('get-settings', async (event, args, options) => {
        fs.readFile(app.getPath('appData') + "\\AyMusic\\" + args, "utf-8", (error, data) => {
            event.returnValue = data
        });
    })

    ipcMain.on('write-settings', async (event, args, options) => {
        fs.writeFile(app.getPath('appData') + "\\AyMusic\\" + args["file"], JSON.stringify(args["data"]), (error) => {
        });
    })

    ipcMain.on('register-frame-url', async (event, args, options) => {
        var exists = false
        var val = { url: args["url"], code: args["code"] }
        for (let code of codeInjecter) {
            exists ||= code["url"] == val.url
        }
        if (!exists)
            codeInjecter.push(val)
    })

    ipcMain.on('show-dialog', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        event.returnValue = dialog.showOpenDialogSync(win, {
            title: "AyMusic",
            filters: [
                { name: 'Music', extensions: ['mp3', "wav", "flac", "ogg", "aac"] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ["openFile", "multiSelections"]
        })
    })

    ipcMain.on('save-cache', async (event, args, options) => {
        var url = app.getPath('appData') + "\\AyMusic\\Cache\\" + args["fileName"].split("/").join("\\")
        mkdirp(path.dirname(url))
        fs.appendFileSync(url, "")
        fs.writeFile(url, Buffer.from(args["bytes"]), function (err) {
        })
    })
}

module.exports.callBoundObject = callBoundObject;
module.exports.codeInjecter = codeInjecter;