const { app, components, BrowserWindow, session, protocol, net, ipcMain, dialog } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { configUpdate, searchUpdates } = require("./update.js")
var { configLogs } = require("./logger.js")
const DiscordRPC = require('discord-rpc');

var codeInjecter = []
var clientToken = {}

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

const callBoundObject = () => {
    const rpc = new DiscordRPC.Client({ transport: 'ipc' });
    const clientId = "1125877607817285742"
    rpc.login({ clientId }).catch(console.error);

    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.setIgnoreMouseEvents(ignore, options)
    })

    ipcMain.on('close-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.close()
    })

    ipcMain.on('change-serv', (event, args, options) => {
        configUpdate.servUrl = args
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
            if (data) configLogs.write = JSON.parse(data)["gen_logs"]
            //console.log(writeLogs)
            event.returnValue = data
        });
    })

    ipcMain.on('write-settings', async (event, args, options) => {
        fs.writeFile(app.getPath('appData') + "\\AyMusic\\" + args["file"], JSON.stringify(args["data"]), (error) => {
            configLogs.write = args["data"]["gen_logs"]
            //console.log(writeLogs)
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

    ipcMain.on('custom-fetch', async (event, args, options) => {
        try {
            event.returnValue = await (await net.fetch(args["url"] + (args["url"].includes("?") ? "&" : "?") + "date=" + Date.now(), args["config"])).text()
        }
        catch (e) {
            console.error(e)
            event.returnValue = e + ""
        }
    })

    ipcMain.on('open-website', async (event, args, options) => {
        var baseUrl = args["baseUrl"]
        var closeUrl = args["closeUrl"]
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            icon: __dirname + "/res/favicon.ico"
            //titleBarOverlay: true
        });
        win.webContents.on("did-navigate", (event, url, httpResponseCode, httpStatusText) => {
            if (url.includes(closeUrl)) {
                win.close()
            }
        })
        win.removeMenu()
        //let ua = win.webContents.userAgent;
        //ua = ua.replace(/aymusic\/[0-9\.-]*/, '');
        //ua = ua.replace(/Electron\/*/, '');
        //win.webContents.userAgent = ua;
        win.loadURL(baseUrl/*, { userAgent: 'Chrome' }*/)
    })

    ipcMain.on('save-cache', async (event, args, options) => {
        var url = app.getPath('appData') + "/AyMusic/Cache/" + args["fileName"]
        mkdirp(path.dirname(url))
        fs.appendFileSync(url, "")
        fs.writeFile(url, Buffer.from(args["bytes"]), function (err) { })
    })

    ipcMain.on('save-data', async (event, args, options) => {
        var url = app.getPath('appData') + "/AyMusic/Data/" + args["fileName"]
        mkdirp(path.dirname(url))
        fs.appendFileSync(url, "")
        fs.writeFile(url, Buffer.from(args["bytes"]), function (err) { })
    })

    ipcMain.on('client-token', async (event, args, options) => {
        event.returnValue = clientToken[args]
    })

    ipcMain.on('rm-client-token', async (event, args, options) => {
        delete clientToken[args]
    })

    ipcMain.on('discord-rpc', async (event, args, options) => {
        rpc.setActivity(args);
    })

    ipcMain.on('search-updates', async (event, args, options) => {
        searchUpdates(event)
    })
}

module.exports.callBoundObject = callBoundObject;
module.exports.codeInjecter = codeInjecter;
module.exports.clientToken = clientToken;