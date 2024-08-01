const { app, components, BrowserWindow, session, protocol, net, webFrameMain, webContents, dialog } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { callBoundObject, codeInjecter, clientToken } = require("./boundobject.js")
var { initLogs, addLogs } = require("./logger.js")
var { ElectronBlocker } = require("@cliqz/adblocker-electron");
//import { ElectronBlocker } from '@cliqz/adblocker-electron';
var { configUpdate } = require("./update.js");
const isPackaged = require('electron-is-packaged').isPackaged;

app.setPath('userData', app.getPath("appData") + "/AyMusic/Cache/WebCache/");
app.userAgentFallback = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36"

var maximize = false
try {
    let settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/UserSettings.json", "utf-8")
    settings = JSON.parse(settings)
    if (settings["other_hwacc"] === false) app.disableHardwareAcceleration();
    if (settings["other_maximize"] === true) maximize = true
}
catch { }

dialog.showErrorBox = function (title, content) {
    console.error(`UNCAUGHT ERROR\n${title}\n${content}`);
};

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
        mainWindow.webContents.executeJavaScript("window.app.recieveEventClient('maximize')")
    })
    mainWindow.on("unmaximize", (event) => {
        mainWindow.webContents.executeJavaScript("window.app.recieveEventClient('unmaximize')")
    })
    mainWindow.setMenuBarVisibility(false)
    protocol.handle('app', async (request) => {
        if (request.url.includes("app://root")) {
            const filePath = request.url.slice('app://root/'.length)
            return net.fetch(url.pathToFileURL(path.join(__dirname, "res", filePath)).toString())
        }
        if (request.url.includes("app://localfiles")) {
            let settings = fs.readFileSync(app.getPath('appData') + "/AyMusic/AllowPaths.json", "utf-8")
            settings = JSON.parse(settings)
            const filePath = request.url.slice('app://localfiles/'.length)
            //return net.fetch("file://" + filePath)
            var file = await net.fetch("file://" + settings[filePath], {
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
            const relativePath = request.url.slice('app://cache/'.length)
            const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
            if (!isSafe) {
                return new Response('bad', {
                    status: 400,
                    headers: { 'content-type': 'text/html' }
                })
            }
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
            const relativePath = request.url.slice('app://cache/'.length)
            const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
            if (!isSafe) {
                return new Response('bad', {
                    status: 400,
                    headers: { 'content-type': 'text/html' }
                })
            }
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
    //mainWindow.webContents.userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36"
    mainWindow.loadURL("app://root/index.html"/*, { userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36" }*/);
    mainWindow.webContents.on(
        'did-frame-navigate',
        (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
            const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
            if (frame) {
                //webContents.fromFrame(frame).userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36"
                for (let i in codeInjecter) {
                    if (encodeURI(decodeURIComponent(frame.url)).includes(encodeURI(decodeURIComponent(codeInjecter[i]["url"])))) {
                        const code = "//injected script by AyMusic app\n" + codeInjecter[i]["code"] + "; console.log('script injected for URL = " + codeInjecter[i]["url"].split("'").join("\\'") + " \\nactual url: ' + window.location.href)"
                        frame.executeJavaScript(code)
                    }
                }
            }
        }
    )
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        let ref = details.requestHeaders["Referer"]
        if (!details.url.includes("accounts.google.com") || ref == "https://www.deezer.com/")
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36"
        else
            details.requestHeaders['User-Agent'] = "Chrome"
        if (details.requestHeaders["authorization"]) {
            if (details.url.includes("spotify.com")) {
                //console.log(details.requestHeaders["authorization"].split("Bearer ")[1])
                clientToken["Spotify"] = details.requestHeaders["authorization"].split("Bearer ")[1]
            }
        }
        if (details.url.includes("https://api-auth.soundcloud.com/oauth/authorize")) {
            let uri = new URL(details.url)
            console.log(details.url, uri.searchParams.get("client_id"))
            clientToken["Soundcloud"] = uri.searchParams.get("client_id")
        }
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })
    session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
        const responseHeaders = details.responseHeaders || {};
        if (!responseHeaders["Access-Control-Allow-Credentials".toLowerCase()]) {
            for (let i in responseHeaders) {
                if (i.toLowerCase() == "access-control-allow-origin") delete responseHeaders[i]
            }
            responseHeaders["access-control-allow-origin"] = "*"
        }
        //AyMusic code
        delete responseHeaders['x-frame-options']
        delete responseHeaders['content-security-policy-report-only']
        delete responseHeaders['content-security-policy']
        if (details.url.includes("spotify.com") || details.url.includes("www.google.com") || details.url.includes("consent.google.com")) {
            for (let i in responseHeaders["set-cookie"]) {
                if (responseHeaders["set-cookie"][i].includes("SameSite=Lax")) {
                    responseHeaders["set-cookie"][i] = responseHeaders["set-cookie"][i].split("SameSite=Lax").join("SameSite=None; Secure")
                }
                else {
                    responseHeaders["set-cookie"][i] += "; SameSite=None"
                }
            }
        }
        if (details.url.includes("youtube.com")) {
            const frame = details.frame
            if (frame) {
                for (let i in codeInjecter) {
                    if (encodeURI(decodeURI(frame.url)).includes(codeInjecter[i]["url"])) {
                        //const code = "if(typeof intytb == 'undefined') { let intytb = setInterval(() => { if(typeof scriptLoad == 'undefined') { try { document.getElementsByTagName('video')[0].pause(); } catch(e) {  } } else { clearInterval(intytb); } }, 1) }"
                        //frame.executeJavaScript(code)
                        //const code2 = "window.adbInterval2 = setInterval(() => { ytInitialPlayerResponse.adSlots = undefined }, 1); "
                        //frame.executeJavaScript(code2)
                    }
                }
            }
        }
        callback({ responseHeaders });
    })
    mainWindow.webContents.on('dom-ready', async (e) => {
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
    let dontClose = true
    mainWindow.on("close", async (e) => {
        if (dontClose && !configUpdate.closing) {
            e.preventDefault()
            dontClose = false
            console.log(await mainWindow.webContents.executeJavaScript("window.listeners.player.disconnect()"))
            mainWindow.close();
        }
    })
    mainWindow.on("session-end", async (e) => {
        console.log(await mainWindow.webContents.executeJavaScript("window.listeners.player.disconnect()"))
    })
    let modifySession = session.fromPartition("persist:modify")
    modifySession.cookies.on("changed", (e, cookie, cause, removed) => {
        let cookieUrl = "http" + (cookie.secure ? "s" : "") + "://" + (cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain) + cookie.path
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
        })
        session.defaultSession.cookies.flushStore()
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
        blocker.enableBlockingInSession(modifySession);
    });
    modifySession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        let ref = details.requestHeaders["Referer"]
        if (!details.url.includes("accounts.google.com") || ref == "https://www.deezer.com/")
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.243 Safari/537.36"
        else
            details.requestHeaders['User-Agent'] = "Chrome"
        if (details.requestHeaders["authorization"]) {
            if (details.url.includes("spotify.com")) {
                //console.log(details.requestHeaders["authorization"].split("Bearer ")[1])
                clientToken["Spotify"] = JSON.stringify({
                    "auth": details.requestHeaders["authorization"].split("Bearer ")[1],
                    "client": details.requestHeaders["x-spotify-connection-id"]
                })
            }
        }
        if (details.url.includes("https://api-auth.soundcloud.com/oauth/authorize")) {
            let uri = new URL(details.url)
            clientToken["Soundcloud"] = JSON.stringify({
                "auth": uri.searchParams.get("client_id")
            })
        }
        callback({ cancel: false, requestHeaders: details.requestHeaders })
    })
    protocol.handle('https', async (req) => {
        return new Promise(async (callback) => {
            const request = net.request({
                method: req.method,
                url: req.url,
                headers: req.headers,
                session: modifySession,
                redirect: 'manual',
                useSessionCookies: true
            });

            req.headers.forEach((value, key, parent) => {
                request.setHeader(key, value)
            })

            request.on('error', (error) => {
                console.error('request error:', error);
            });

            request.on('redirect', (statusCode, method, redirectUrl, responseHeaders) => {
                console.log('redirecting to:', redirectUrl);
                callback(new Response(null, {
                    status: statusCode,
                    headers: responseHeaders,
                }));
                request.followRedirect();
            });

            request.on('response', (response) => {
                const chunks = [];

                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    if (response.headers["content-type"] && response.headers["content-type"].includes("text/html") && req.url.includes("youtube.com")) {
                        let modifiedResponse = new TextDecoder().decode(Buffer.concat(chunks), 'utf8');

                        //for modifying response here
                        const modifiedText = modifiedResponse.replace("adSlots", "fkyt");
                        modifiedResponse = Buffer.from(modifiedText, 'utf8');

                        callback(new Response(modifiedResponse, {
                            status: response.statusCode == 204 ? 200 : response.statusCode,
                            statusText: response.statusMessage,
                            headers: response.headers,
                        }));
                    } else {
                        callback(new Response(Buffer.concat(chunks), {
                            status: response.statusCode == 204 ? 200 : response.statusCode,
                            statusText: response.statusMessage,
                            headers: response.headers,
                        }));
                    }
                });
            });
            let cookies = await session.defaultSession.cookies.get({ url: req.url })
            request.setHeader('Cookie', cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '));
            if (req.body) {
                await request.write(Buffer.from(new Uint8Array(await new Response(req.body).arrayBuffer())));
            }
            request.end();
        });
    })
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