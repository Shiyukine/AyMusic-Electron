const { app, components, BrowserWindow, session, protocol, net, webFrameMain } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { callBoundObject, codeInjecter } = require("./boundobject.js")

app.setPath('userData', app.getPath("userData") + "\\Cache\\WebCache\\");
console.log(app.getPath("appData") + "\\AyMusic\\Cache\\Image\\")

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

mkdirp(app.getPath("appData") + "\\AyMusic\\Cache\\Adblock\\")

const filter = {
    urls: ['*://*/*']
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        frame: false,
        useContentSize: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
        //titleBarOverlay: true
    });
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
            const filePath = app.getPath("appData") + "\\AyMusic\\Cache\\" + request.url.slice('app://cache/'.length)
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
    mainWindow.loadURL("app://root/index.html");
    mainWindow.webContents.on(
        'did-frame-navigate',
        (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
            const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
            if (frame) {
                for (let i in codeInjecter) {
                    if (frame.url.includes(codeInjecter[i]["url"])) {
                        const code = "//injected script by AyMusic app\n" + codeInjecter[i]["code"] + "; console.log('script injected for URL = " + codeInjecter[i]["url"] + "')"
                        frame.executeJavaScript(code)
                    }
                }
            }
        }
    )
    mainWindow.webContents.on('dom-ready', (e) => {
        session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"
            callback({ cancel: false, requestHeaders: details.requestHeaders })
        })
        session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
            if (details.url.includes("spotify.com")) {
                delete details.responseHeaders['content-security-policy']
                delete details.responseHeaders['x-frame-options']
                for (let i in details.responseHeaders["set-cookie"]) {
                    if (details.responseHeaders["set-cookie"][i].includes("SameSite=Lax")) {
                        details.responseHeaders["set-cookie"][i] = details.responseHeaders["set-cookie"][i].split("SameSite=Lax").join("SameSite=None; Secure")
                    }
                    else {
                        details.responseHeaders["set-cookie"][i] += "; SameSite=None"
                    }
                }
            }
            callback({ cancel: false, responseHeaders: details.responseHeaders })
        })
        var platform = process.platform
        if (platform == "darwin") platform = "MacOS"
        if (platform == "win32") platform = "Windows"
        if (platform == "linux") platform = "Linux"
        mainWindow.webContents.executeJavaScript(`
        var intev = setInterval(() => {
            if(!loaded) {
                console.log('Attempt registerClient')
                if(typeof app != 'undefined' && app) {
                    app.registerClient('` + platform + `', '` + "v0.1" + "', " + "0" + `, window.boundobject)
                    clearInterval(intev)
                }
            }
            else {
                clearInterval(intev)
            }
        }, 100)
        app.registerClient('Windows', '` + "v0.1" + "', " + "0" + `, window.boundobject)`)
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