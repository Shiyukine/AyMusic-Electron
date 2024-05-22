const { app, components, BrowserWindow, session, protocol, net, ipcMain, dialog, shell } = require('electron');
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
    if (process.platform == "win32") {
        const clientId = "1125877607817285742"
        rpc.login({ clientId }).catch(console.error);
    }

    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.setIgnoreMouseEvents(ignore, options)
    })

    ipcMain.on('close-window', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        win.close()
    })

    ipcMain.on('restart-window', (event, ignore, options) => {
        app.relaunch()
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
        const relativePath = args
        const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
        if (args.includes("AllowPaths") || !isSafe) event.returnValue = "{}"
        else {
            fs.readFile(app.getPath('appData') + "/AyMusic/" + args, "utf-8", (error, data) => {
                if (data) configLogs.write = JSON.parse(data)["gen_logs"]
                //console.log(writeLogs)
                event.returnValue = data
            });
        }
    })

    ipcMain.on('have-cookie', (event, args, options) => {
        session.defaultSession.cookies.get({ url: args["url"], name: args["name"] })
            .then((cookies) => {
                event.returnValue = cookies
            }).catch((error) => {
                console.log(error)
            })
    })

    ipcMain.on('write-settings', async (event, args, options) => {
        const relativePath = args["file"]
        const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
        if (!args["file"].includes("AllowPaths") && isSafe) {
            fs.writeFile(app.getPath('appData') + "/AyMusic/" + args["file"], JSON.stringify(args["data"]), (error) => {
                configLogs.write = args["data"]["gen_logs"]
                //console.log(writeLogs)
            });
        }
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
        let settings = {}
        try {
            settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/AllowPaths.json", "utf-8")
            settings = JSON.parse(settings)
        }
        catch { }
        const win = BrowserWindow.fromWebContents(event.sender)
        let retVal = dialog.showOpenDialogSync(win, {
            title: "AyMusic",
            filters: [
                { name: 'Music', extensions: ['mp3', "wav", "flac", "ogg", "aac"] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ["openFile", "multiSelections"]
        })
        let newPath = []
        if (typeof retVal !== "undefined") {
            for (let valpath of retVal) {
                let settingsRdm = undefined
                for (let key in settings) {
                    if (settings[key] == valpath) {
                        settingsRdm = key
                        break
                    }
                }
                let rdm = typeof settingsRdm !== "undefined" ? settingsRdm : (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2) + (Math.random() + 1).toString(36).substring(2) + path.extname(valpath)
                settings[rdm] = valpath
                newPath.push([rdm, path.basename(valpath)])
            }
            fs.writeFile(app.getPath('appData') + "/AyMusic/AllowPaths.json", JSON.stringify(settings), (error) => { });
            event.returnValue = newPath
        }
        else {
            event.returnValue = retVal
        }
    })

    ipcMain.handle('custom-fetch', async (event, args, options) => {
        try {
            return await (await net.fetch(args["url"] + (args["url"].includes("?") ? "&" : "?") + "date=" + Date.now(), args["config"])).text()
        }
        catch (e) {
            console.error(e)
            return e + ""
        }
    })

    ipcMain.on('open-website', async (event, args, options) => {
        var baseUrl = args["baseUrl"]
        var closeUrl = args["closeUrl"]
        var filter = args["useIncludeUrlFilter"]
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            icon: __dirname + "/res/favicon.ico"
            //titleBarOverlay: true
        });
        win.webContents.on("did-navigate", (event, url, httpResponseCode, httpStatusText) => {
            let cond = url.includes(closeUrl)
            if (!filter) cond = url == closeUrl
            if (cond) {
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

    ipcMain.handle('save-cache', async (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Cache/" + args["fileName"]
            mkdirp(path.dirname(url))
            fs.appendFileSync(url, "")
            if (args["bytes"]) {
                fs.writeFile(url, Buffer.from(args["bytes"]), function (err) { r(err) })
            }
        })
    })

    ipcMain.handle('save-data', async (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Data/" + args["fileName"]
            mkdirp(path.dirname(url))
            fs.appendFileSync(url, "")
            if (args["bytes"]) {
                fs.writeFile(url, Buffer.from(args["bytes"]), function (err) { r(err) })
            }
        })
    })

    ipcMain.handle('remove-cache', async (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Cache/" + args["fileName"]
            fs.rm(url, { recursive: true, force: true }, function (err) { r(err) })
        })
    })

    ipcMain.handle('remove-data', async (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Data/" + args["fileName"]
            fs.rm(url, { recursive: true, force: true }, function (err) { r(err) })
        })
    })

    ipcMain.on('client-token', async (event, args, options) => {
        event.returnValue = clientToken[args]
    })

    ipcMain.on('rm-client-token', async (event, args, options) => {
        delete clientToken[args]
    })

    ipcMain.on('open-link', async (event, args, options) => {
        shell.openExternal(args)
    })

    ipcMain.on('discord-rpc', async (event, args, options) => {
        if (process.platform == "win32") {
            try {
                rpc.setActivity(args);
            }
            catch {
                try {
                    rpc.login({ clientId }).catch(console.error);
                    rpc.setActivity(args);
                }
                catch (e) {
                    console.error(e)
                }
            }
        }
    })

    ipcMain.on('search-updates', async (event, args, options) => {
        searchUpdates(event)
    })
}

module.exports.callBoundObject = callBoundObject;
module.exports.codeInjecter = codeInjecter;
module.exports.clientToken = clientToken;