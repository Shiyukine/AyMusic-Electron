const { app, components, BrowserWindow, session, protocol, net, webFrameMain, webContents, dialog, crashReporter } = require('electron');
const path = require("path");
const url = require('url');
var fs = require('fs');
var { callBoundObject, codeInjecter, clientToken, overrideResponses } = require("./boundobject.js")
var { initLogs, addLogs } = require("./logger.js")
var { ElectronBlocker } = require("@cliqz/adblocker-electron");
//import { ElectronBlocker } from '@cliqz/adblocker-electron';
var { configUpdate } = require("./update.js");
const isPackaged = require('electron-is-packaged').isPackaged;

app.setPath('userData', app.getPath("appData") + "/AyMusic/Cache/WebCache/");
app.setPath('crashDumps', app.getPath("appData") + "/AyMusic/CrashDumps/");
app.userAgentFallback = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36"
crashReporter.start({ uploadToServer: false })

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
    //mainWindow.webContents.userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36"
    mainWindow.loadURL("app://root/index.html"/*, { userAgent: "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36" }*/);
    mainWindow.webContents.on(
        'did-frame-navigate',
        (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
            const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
            if (frame) {
                //webContents.fromFrame(frame).userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36"
                for (let i in codeInjecter) {
                    if (encodeURI(decodeURIComponent(frame.url)).includes(encodeURI(decodeURIComponent(codeInjecter[i]["url"])))) {
                        const code = "//injected script by AyMusic app\n" + codeInjecter[i]["code"] + "; console.log('script injected for URL = " + codeInjecter[i]["url"].split("'").join("\\'") + " \\nactual url: ' + window.location.href)"
                        frame.executeJavaScript(code)
                    }
                }
            }
        }
    )
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
        }).catch((e) => {
            console.error("Unable to set cookie", cookie.name, cookieUrl)
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
        blocker.enableBlockingInSession(session.defaultSession);
    });
    modifySession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        let ref = details.requestHeaders["Referer"]
        if (!details.url.includes("accounts.google.com") || ref == "https://www.deezer.com/")
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.185 Safari/537.36"
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
            clientToken["Soundcloud"] = uri.searchParams.get("client_id")
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
                useSessionCookies: true,
                cache: !isPackaged ? "no-cache" : "default",
            });

            req.headers.forEach((value, key, parent) => {
                request.setHeader(key, value)
            })

            request.on('error', (error) => {
                if (error.message.includes("net::ERR_BLOCKED_BY_CLIENT")) return
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
                    try {
                        overrideResponses.forEach(x => {
                            if (((x.url.url.includes && req.url.includes(x.url.url)) || x.url.url == req.url) && x.method.toLowerCase() == req.method.toLowerCase() && response.headers[x.header.name.toLowerCase()] && ((x.header.includes && response.headers[x.header.name.toLowerCase()].toLowerCase().includes(x.header.value.toLowerCase())) || response.headers[x.header.name].toLowerCase() == x.header.value.toLowerCase())) {
                                let modifiedResponse = new TextDecoder().decode(Buffer.concat(chunks), 'utf8');
                                x.overrides.forEach(element => {
                                    modifiedResponse = modifiedResponse.split(element.search).join(element.replace)
                                });
                                callback(new Response(modifiedResponse, {
                                    status: response.statusCode == 204 ? 200 : response.statusCode,
                                    statusText: response.statusMessage,
                                    headers: response.headers,
                                }));
                                return
                            }
                        });
                    }
                    catch (e) {
                        console.error("Malformed override response settings!", e)
                    }
                    callback(new Response(Buffer.concat(chunks), {
                        status: response.statusCode == 204 ? 200 : response.statusCode,
                        statusText: response.statusMessage,
                        headers: response.headers,
                    }));
                });
            });
            let cookies = await session.defaultSession.cookies.get({ url: req.url })
            // remove all 304 http code generators
            request.removeHeader("If-Modified-Since")
            request.removeHeader("If-None-Match")
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