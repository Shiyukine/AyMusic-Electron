const path = require('node:path');
const { app, components, BrowserWindow, session, protocol, net, webFrameMain, webContents } = require('electron');
const url = require('url');
var fs = require('fs');
var { callBoundObject, codeInjecter, clientToken } = require("./boundobject.js")
var { initLogs, addLogs } = require("./logger.js")
var { configUpdate } = require("./update.js")
const isPackaged = require('electron-is-packaged').isPackaged;

app.setPath('userData', app.getPath("appData") + "/AyMusic/Cache/WebCache/");
app.userAgentFallback = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

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

const createWindow = () => {
    initLogs()
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        //frame: process.platform != "win32",
        useContentSize: true,
        icon: __dirname + "/res/public/favicon.ico",
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            contextIsolation: true,
            sandbox: false, //security risks ??
        },
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

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    mainWindow.webContents.on(
        'did-frame-navigate',
        (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
            const frame = webFrameMain.fromId(frameProcessId, frameRoutingId)
            if (frame) {
                //webContents.fromFrame(frame).userAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.106 Safari/537.36"
                for (let i in codeInjecter) {
                    if (encodeURI(decodeURIComponent(frame.url)).includes(encodeURI(decodeURIComponent(codeInjecter[i]["url"])))) {
                        const code = "//injected script by AyMusic app\n" + codeInjecter[i]["code"] + "; console.log('script injected for URL = " + codeInjecter[i]["url"].split("'").join("\\'") + " \\nactual url: ' + window.location.href)"
                        frame.executeJavaScript(code)
                    }
                }
            }
        }
    )

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        //console.log('renderer console.%s: %s', ['debug', 'info', 'warn', 'error'][level], message);
        addLogs(level, message, line, sourceId)
    });
};

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    await components.whenReady();
    console.log('components ready:', components.status());
    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

callBoundObject()

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.