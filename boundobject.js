const { app, components, BrowserWindow, session, protocol, net, ipcMain, dialog, shell } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { configUpdate, searchUpdates } = require("./update.js")
var { configLogs } = require("./logger.js")
const DiscordRPC = require('./plugins/discordjs-RPC');
var { adblockList, addBlockRequest } = require("./adblock.js")
var { addLogs } = require("./logger.js")

var codeInjecter = []
var overrideResponses = []
var clientToken = {}
var iframeStatus = {}

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

const callBoundObject = () => {
    var curPlatform = process.platform
    if (curPlatform == "darwin") curPlatform = "MacOS"
    if (curPlatform == "win32") curPlatform = "Windows"
    if (curPlatform == "linux") curPlatform = "Linux"
    const rpc = new DiscordRPC.Client({ transport: 'ipc' });
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (process.platform == "win32") {
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
        var val = { url: args["url"], code: args["code"] }
        let toRemove = []
        for (let i in codeInjecter) {
            if (codeInjecter[i]["url"] == val.url) toRemove.push(i)
        }
        for (let i of toRemove) {
            codeInjecter.splice(i, 1)
        }
        codeInjecter.push(val)
    })

    ipcMain.on('get-iframe-status', async (event, args, options) => {
        let url = args["url"]
        let status = iframeStatus[url] || 0
        event.returnValue = status
    })

    ipcMain.on('register-override-response', async (event, args, options) => {
        let val = JSON.parse(args["json"])
        if (val.length == 0) return
        val.forEach(element => {
            if (element.platforms.includes(curPlatform) && !overrideResponses.includes(element)) overrideResponses.push(element)
        });
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
        let loginSession = session.fromPartition("persist:login")
        let modifySession = session.fromPartition("persist:modify")
        loginSession.cookies.on("changed", (e, cookie, cause, removed) => {
            let cookieUrl = "http" + (cookie.secure ? "s" : "") + "://" + (cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain) + cookie.path
            //console.log("Cookie changed", cookie.name, cookieUrl)
            if (removed && cause != "overwrite") {
                session.defaultSession.cookies.remove(cookieUrl, cookie.name).catch((e) => {
                    console.error("Unable to remove cookie", cookie.name, cookieUrl, e)
                })
                modifySession.cookies.remove(cookieUrl, cookie.name).catch((e) => {
                    console.error("Unable to remove cookie", cookie.name, cookieUrl, e)
                })
            }
            else {
                session.defaultSession.cookies.set({
                    url: cookieUrl,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    httpOnly: cookie.httpOnly,
                    secure: cookie.secure,
                    expirationDate: cookie.expirationDate,
                    sameSite: cookie.sameSite,
                    hostOnly: cookie.hostOnly,
                    session: cookie.session,
                    path: cookie.path,
                }).catch((e) => {
                    console.error("Unable to set cookie", cookie.name, cookieUrl, e)
                })
                modifySession.cookies.set({
                    url: cookieUrl,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    httpOnly: cookie.httpOnly,
                    secure: cookie.secure,
                    expirationDate: cookie.expirationDate,
                    sameSite: cookie.sameSite,
                    hostOnly: cookie.hostOnly,
                    session: cookie.session,
                    path: cookie.path,
                }).catch((e) => {
                    console.error("Unable to set cookie", cookie.name, cookieUrl, e)
                })
            }
            session.defaultSession.cookies.flushStore()
            modifySession.cookies.flushStore()
        })
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            icon: __dirname + "/res/favicon.ico",
            webPreferences: {
                session: loginSession
            }
            //titleBarOverlay: true
        });
        win.webContents.on("did-navigate", (event, url, httpResponseCode, httpStatusText) => {
            let cond = url.includes(closeUrl)
            if (!filter) cond = url == closeUrl
            if (cond) {
                win.close()
            }
        })
        win.webContents.on('console-message', (event, level, message, line, sourceId) => {
            //console.log('renderer console.%s: %s', ['debug', 'info', 'warn', 'error'][level], message);
            addLogs(level, message, line, sourceId)
        });
        win.removeMenu()
        //let ua = win.webContents.userAgent;
        //ua = ua.replace(/aymusic\/[0-9\.-]*/, '');
        //ua = ua.replace(/Electron\/*/, '');
        //win.webContents.userAgent = ua;
        win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            if (baseUrl.includes("soundcloud.com")) {
                details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.168 Safari/537.36';
            }
            else if (details.url.includes("google.com") && !details.referrer.includes("deezer.com")) {
                details.requestHeaders['User-Agent'] = 'Chrome';
            }
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
        win.loadURL(baseUrl, /*{ userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36" }*/)
    })

    ipcMain.handle('save-cache', async (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Cache/" + args["fileName"]
            mkdirp(path.dirname(url))
            if (args["bytes"]) {
                fs.appendFile(url, "", function (ret) {
                    if (!ret) {
                        fs.writeFile(url, Buffer.from(args["bytes"]), function (err) {
                            if (err) r(err)
                            else r()
                        })
                    }
                    else r(ret)
                })
            }
            else r()
        })
    })

    ipcMain.handle('save-data', (event, args, options) => {
        return new Promise(r => {
            var url = app.getPath('appData') + "/AyMusic/Data/" + args["fileName"]
            mkdirp(path.dirname(url))
            if (args["bytes"]) {
                fs.appendFile(url, "", function (ret) {
                    if (!ret) {
                        fs.writeFile(url, Buffer.from(args["bytes"]), function (err) {
                            if (err) r(err)
                            else r()
                        })
                    }
                    else r(ret)
                })
            }
            else r()
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
                if (args) rpc.setActivity(args);
                else rpc.clearActivity();
            }
            catch {
                try {
                    rpc.login({ clientId }).catch(console.error);
                    if (args) rpc.setActivity(args);
                    else rpc.clearActivity();
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

    ipcMain.on('add-bad-url', async (event, args, options) => {
        addBlockRequest(args["url"], args["includes"])
    })
}

module.exports.callBoundObject = callBoundObject;
module.exports.codeInjecter = codeInjecter;
module.exports.clientToken = clientToken;
module.exports.overrideResponses = overrideResponses;
module.exports.iframeStatus = iframeStatus;
