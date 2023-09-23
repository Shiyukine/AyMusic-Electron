const { app, components, BrowserWindow, session, protocol, net, webFrameMain, webContents } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { callBoundObject, codeInjecter, clientToken } = require("./boundobject.js")
var { initLogs, addLogs } = require("./logger.js")
var { ElectronBlocker } = require("@cliqz/adblocker-electron");
//import { ElectronBlocker } from '@cliqz/adblocker-electron';
var { configUpdate } = require("./update.js")
const isPackaged = require('electron-is-packaged').isPackaged;

app.setPath('userData', app.getPath("appData") + "/AyMusic/Cache/WebCache/");
app.userAgentFallback = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"

var maximize = false
try {
    let settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/UserSettings.json", "utf-8")
    settings = JSON.parse(settings)
    if (settings["other_hwacc"] === false) app.disableHardwareAcceleration();
    if (settings["other_maximize"] === true) maximize = true
}
catch { }

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

mkdirp(app.getPath("appData") + "/AyMusic/Cache/Adblock/")

const filter = {
    urls: ['*://*/*']
}

async function createWindow() {
    initLogs()
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: process.platform != "win32",
        useContentSize: true,
        webPreferences: {
            contextIsolation: true,
            //nodeIntegration: true, //WARNING SECURITY RISKS !!!
            sandbox: false, //security risks ??
            preload: path.join(__dirname, "preload.js"),
        },
        icon: __dirname + "/res/favicon.ico",
        //titleBarOverlay: true
    });
    if (maximize) mainWindow.maximize()
    mainWindow.on("maximize", (event, isAlwaysOnTop) => {
        let settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/UserSettings.json", "utf-8")
        settings = JSON.parse(settings)
        settings["other_maximize"] = true
        fs.writeFile(app.getPath('appData') + "/AyMusic/UserSettings.json", JSON.stringify(settings), (error) => { });
    })
    mainWindow.on("unmaximize", (event) => {
        let settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/UserSettings.json", "utf-8")
        settings = JSON.parse(settings)
        settings["other_maximize"] = false
        fs.writeFile(app.getPath('appData') + "/AyMusic/UserSettings.json", JSON.stringify(settings), (error) => { });
    })
    mainWindow.setMenuBarVisibility(false)
    protocol.handle('app', async (request) => {
        if (request.url.includes("app://root")) {
            const filePath = request.url.slice('app://root/'.length)
            return net.fetch(url.pathToFileURL(path.join(__dirname, "res", filePath)).toString())
        }
        if (request.url.includes("app://localfiles")) {
            const filePath = request.url.slice('app://localfiles/'.length)
            //return net.fetch("file://" + filePath)
            var file = await net.fetch("file://" + filePath, {
                headers: request.headers
            })
            var fileContent = await file.arrayBuffer()
            file.headers.append("Accept-Ranges", "bytes")
            file.headers.append("Content-Length", fileContent.byteLength)
            return new Response(fileContent, {
                headers: file.headers
            })
        }
        if (request.url.includes("app://cache")) {
            const filePath = app.getPath("appData") + "/AyMusic/Cache/" + request.url.slice('app://cache/'.length)
            //return net.fetch("file://" + filePath)
            var file = await net.fetch("file://" + filePath, {
                headers: request.headers
            })
            var fileContent = await file.arrayBuffer()
            file.headers.append("Accept-Ranges", "bytes")
            file.headers.append("Content-Length", fileContent.byteLength)
            return new Response(fileContent, {
                headers: file.headers
            })
        }
        if (request.url.includes("app://data")) {
            const filePath = app.getPath("appData") + "/AyMusic/Data/" + request.url.slice('app://data/'.length)
            //return net.fetch("file://" + filePath)
            var file = await net.fetch("file://" + filePath, {
                headers: request.headers
            })
            var fileContent = await file.arrayBuffer()
            file.headers.append("Accept-Ranges", "bytes")
            file.headers.append("Content-Length", fileContent.byteLength)
            return new Response(fileContent, {
                headers: file.headers
            })
        }
    })
    //mainWindow.webContents.userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"
    mainWindow.loadURL("app://root/index.html"/*, { userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36" }*/);
    mainWindow.webContents.on(
        'did-frame-navigate',
        (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
            const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
            if (frame) {
                //webContents.fromFrame(frame).userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"
                for (let i in codeInjecter) {
                    if (encodeURI(decodeURIComponent(frame.url)).includes(encodeURI(decodeURIComponent(codeInjecter[i]["url"])))) {
                        const code = "//injected script by AyMusic app\n" + codeInjecter[i]["code"] + "; console.log('script injected for URL = " + codeInjecter[i]["url"].split("'").join("\\'") + "')"
                        frame.executeJavaScript(code)
                    }
                }
            }
        }
    )
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        let ref = details.requestHeaders["Referer"]
        if (!details.url.includes("accounts.google.com") || ref == "https://www.deezer.com/")
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"
        else
            details.requestHeaders['User-Agent'] = "Chrome"
        if (details.requestHeaders["authorization"]) {
            if (details.url.includes("spotify.com")) {
                //console.log(details.requestHeaders["authorization"].split("Bearer ")[1])
                clientToken["Spotify"] = details.requestHeaders["authorization"].split("Bearer ")[1]
            }
        }
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })
    ElectronBlocker.fromLists(net.fetch, [
        'https://easylist.to/easylist/easylist.txt',
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
        "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
        "https://easylist.to/easylist/easyprivacy.txt",
    ]).then(blocker => {
        blocker.enableBlockingInSession(session.defaultSession);
    });
    mainWindow.webContents.on('dom-ready', async (e) => {
        /*session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
            delete details.responseHeaders['x-frame-options']
            delete details.responseHeaders['content-security-policy-report-only']
            if (details.url.includes("spotify.com")) {
                for (let i in details.responseHeaders["set-cookie"]) {
                    if (details.responseHeaders["set-cookie"][i].includes("SameSite=Lax")) {
                        details.responseHeaders["set-cookie"][i] = details.responseHeaders["set-cookie"][i].split("SameSite=Lax").join("SameSite=None; Secure")
                    }
                    else {
                        details.responseHeaders["set-cookie"][i] += "; SameSite=None"
                    }
                }
                details.responseHeaders["access-control-allow-origin"] = "*"
                delete details.responseHeaders['content-security-policy']
            }
            if (details.url.includes("youtube.com")) {
                const frame = details.frame
                if (frame) {
                    for (let i in codeInjecter) {
                        if (encodeURI(decodeURI(frame.url)).includes(codeInjecter[i]["url"])) {
                            const code = "if(typeof intytb == 'undefined') { let intytb = setInterval(() => { if(typeof scriptLoad == 'undefined') { try { document.getElementsByTagName('video')[0].pause(); } catch(e) {  } } else { clearInterval(intytb); } }, 1) }"
                            frame.executeJavaScript(code)
                        }
                    }
                }
            }
            callback({ cancel: false, responseHeaders: details.responseHeaders })
        })*/
        /*var anBlockerHeaders = blocker.onHeadersReceived
        blocker.onHeadersReceived = (details, callback) => {
            anBlockerHeaders(details, callback)
        }*/
        var platform = process.platform
        if (platform == "darwin") platform = "MacOS"
        if (platform == "win32") platform = "Windows"
        if (platform == "linux") platform = "Linux"
        configUpdate.isRelease = isPackaged
        //for testing only
        //platform = "Android"
        mainWindow.webContents.executeJavaScript(`
        var intev = setInterval(() => {
            if(!loaded) {
                console.log('Attempt registerClient')
                if(typeof app != 'undefined' && app) {
                    app.registerClient('` + platform + `', '` + "v" + configUpdate.versionName + "', " + configUpdate.versionCode + `, window.boundobject,` + isPackaged + `)
                    clearInterval(intev)
                }
            }
            else {
                clearInterval(intev)
            }
        }, 100)
        app.registerClient('` + platform + `', '` + "v" + configUpdate.versionName + "', " + configUpdate.versionCode + `, window.boundobject,` + isPackaged + `)`)
        process.argv.forEach((val, index) => {
            if (val == "--no-sandbox") {
                mainWindow.webContents.executeJavaScript("window.forceRestart = true")
            }
        });
    });
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        //console.log('renderer console.%s: %s', ['debug', 'info', 'warn', 'error'][level], message);
        addLogs(level, message, line, sourceId)
    });
}

protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app', privileges: {
            bypassCSP: true,
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true
        }
    }
])

app.whenReady().then(async () => {
    await components.whenReady();
    console.log('components ready:', components.status());
    createWindow();
});

callBoundObject()