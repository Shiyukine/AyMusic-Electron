const crypto = require('crypto');
const { app, BrowserWindow, net, shell, remote } = require('electron');
const electronDl = require('electron-dl');
const fs = require('fs');
const path = require('path');
const { resolve } = require('path');
const { addLogs } = require('./logger.js');
const { readdir } = require('fs').promises;

async function getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

var configUpdate = {
    servUrl: "",
    versionName: "0.3.2",
    versionCode: 9,
    isRelease: false,
    closing: false
}

function getChecksum(path) {
    return new Promise((resolve, reject) => {
        // if absolutely necessary, use md5
        const hash = crypto.createHash('sha256');
        const input = fs.createReadStream(path);
        input.on('error', reject);
        input.on('data', (chunk) => {
            hash.update(chunk);
        });
        input.on('close', () => {
            resolve(hash.digest('hex'));
        });
    });
}

function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = path.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

function dlFile(win, appPath, dlPathServ, platform, file) {
    return new Promise(async resolve => {
        try {
            console.log(dlPathServ.split("%platform%").join(platform).split("%file%").join(file))
            mkdirp(appPath + "/DownloadTemp/" + file.split("/").slice(0, -1).join("/") + "/")
            let dl = await electronDl.download(win, dlPathServ.split("%platform%").join(platform).split("%file%").join(file), {
                directory: appPath + "/DownloadTemp/" + file.split("/").slice(0, -1).join("/") + "/",
                onTotalProgress: (e) => {
                    win.webContents.send('update-state-change', {
                        step: 4,
                        file: file,
                        cur: e.transferredBytes,
                        max: e.totalBytes
                    })
                },
                onCompleted: (e) => {
                    resolve()
                },
                overwrite: true
            })
        }
        catch (e) {
            win.webContents.send('update-state-change', {
                step: -2,
                error: e,
                file: null,
                cur: 0,
                max: 1
            })
        }
    })
}

function dlFileNotTemp(win, appPath, dlPathServ, platform, file) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(dlPathServ.split("%platform%").join(platform).split("%file%").join(file))
            let dl = await electronDl.download(win, dlPathServ.split("%platform%").join(platform).split("%file%").join(file), {
                directory: appPath + file.split("/").slice(0, -1).join("/") + "/",
                onCompleted: (e) => {
                    resolve()
                },
                overwrite: true
            })
        }
        catch (e) {
            win.webContents.send('update-state-change', {
                step: -2,
                error: e,
                file: null,
                cur: 0,
                max: 1
            })
            console.error(e)
            reject(e)
        }
    })
}

let alreadyFixPerm = false

function fixPerm(appPath) {
    var platform = process.platform
    if (platform != "linux") return
    console.log(appPath)
    if (alreadyFixPerm) return
    require("child_process").execSync("pkexec chown -R \"$USER\":\"$USER\" \"" + appPath + "\"");
    alreadyFixPerm = true
}

const searchUpdates = async (event) => {
    process.noAsar = true
    var platform = process.platform
    if (platform == "darwin") platform = "macos"
    if (platform == "win32") platform = "windows"
    if (platform == "linux") platform = "linux"
    let win = BrowserWindow.fromWebContents(event.sender)
    let appPath = ""
    try {
        win.webContents.send('update-state-change', {
            step: 0,
            file: configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json",
            cur: 0,
            max: 100
        })
        let out = await (await net.fetch(configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json?date=" + Date.now())).text()
        win.webContents.send('update-state-change', {
            step: 0,
            file: configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json",
            cur: 50,
            max: 100
        })
        if (out) out = JSON.parse(out)
        let dlPathServ = (!(url = configUpdate.servUrl).match('^http[s]?:\/\/((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])') ? url.split("https://").join("https://files.") : url) + "dl/AyMusic/Updates/%platform%/%file%"
        let servJsonOut = {}
        for (let f in out) {
            if (f != "***INFOS***") servJsonOut[f] = out[f]
        }
        win.webContents.send('update-state-change', {
            step: 0,
            file: configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json",
            cur: 100,
            max: 100
        })
        if (platform == "windows") {
            appPath = path.dirname(app.getPath("exe"))
            if (fs.existsSync(appPath + "/AketsukyUpdaterTEMP.exe")) fs.rmSync(appPath + "/AketsukyUpdaterTEMP.exe")
            if (!fs.existsSync(appPath + "/AketsukyUpdater.exe") && configUpdate.isRelease) {
                await dlFileNotTemp(win, appPath, dlPathServ, platform, "AketsukyUpdater.exe")
                win.webContents.send('update-state-change', {
                    step: -2,
                    error: "Some required files are not available to update the app. Try to deactivate your antivirus and retry.",
                    file: null,
                    cur: 0,
                    max: 1
                })
                return
            }
        }
        if (platform == "linux") {
            appPath = path.dirname(app.getPath("exe"))
            if (!fs.existsSync(appPath + "/AketsukyUpdater.sh") && configUpdate.isRelease) {
                fixPerm(appPath)
                await dlFileNotTemp(win, appPath, dlPathServ, platform, "AketsukyUpdater.sh")
                /*win.webContents.send('update-state-change', {
                    step: -2,
                    error: "Some required files are not available to update the app. Please resintall this app.",
                    file: null,
                    cur: 0,
                    max: 1
                })*/
                await searchUpdates(event)
                return
            }
            if (fs.existsSync(appPath + "/AketsukyUpdaterTEMP.sh")) {
                if (alreadyFixPerm) fs.rmSync(appPath + "/AketsukyUpdaterTEMP.sh")
                else require("child_process").execSync("pkexec rm \"" + appPath + "/AketsukyUpdaterTEMP.sh\"");
            }
        }
        let files = await getFiles(appPath)
        let clientJsonOut = {}
        for (let i in files) {
            let file = files[i]
            try {
                clientJsonOut[file.split("\\").join("/").split(appPath.split("\\").join("/") + "/").join("")] = await getChecksum(file)
                win.webContents.send('update-state-change', {
                    step: 1,
                    file: file,
                    cur: i,
                    max: files.length - 1
                })
            }
            catch (e) {
                win.webContents.send('update-state-change', {
                    step: -2,
                    error: e,
                    file: null,
                    cur: 0,
                    max: 1
                })
            }
        }
        console.log(JSON.stringify(clientJsonOut))
        let filesToUpdate = []
        for (let i in servJsonOut) {
            let file = servJsonOut[i]
            let clientFile = null
            if (clientJsonOut[i]) clientFile = clientJsonOut[i]
            if (clientFile != file) filesToUpdate.push(i)
            win.webContents.send('update-state-change', {
                step: 2,
                file: file,
                cur: i,
                max: servJsonOut.length - 1
            })
        }
        if (filesToUpdate.length == 0) {
            win.webContents.send('update-state-change', {
                step: -1,
                file: null,
                cur: 1,
                max: 1
            })
        }
        else {
            fixPerm(appPath);
            for (let i in filesToUpdate) {
                let file = filesToUpdate[i]
                mkdirp(appPath + "/DownloadTemp/")
                win.webContents.send('update-state-change', {
                    step: 3,
                    file: file,
                    cur: parseInt(i) + 1,
                    max: filesToUpdate.length
                })
                await dlFile(win, appPath, dlPathServ, platform, file)
            }
            win.webContents.send('update-state-change', {
                step: 5,
                file: null,
                cur: 1,
                max: 1
            })
            if (platform == "windows") {
                fs.copyFileSync(appPath + "/AketsukyUpdater.exe", appPath + "/AketsukyUpdaterTEMP.exe")
                let spawn = require("child_process").spawn;
                let bat = spawn(appPath + "/AketsukyUpdaterTEMP.exe", [
                    "--move-files",
                    "--app=AyMusic",
                    "--ver-update=1"
                ], {
                    detached: true
                });
                bat.unref()
                /*bat.stdout.on("data", (data) => {
                    console.log(data.toString())
                });

                bat.stderr.on("data", (err) => {
                    console.log(err.toString())
                });

                bat.on("exit", (code) => {
                    console.log(code)
                    
                });*/
                configUpdate.closing = true
                win.close()
            }
            else if (platform == "linux") {
                fs.copyFileSync(appPath + "/AketsukyUpdater.sh", appPath + "/AketsukyUpdaterTEMP.sh")
                const { execFileSync, exec, execFile, execSync, fork, spawn } = require('node:child_process');
                execSync("chmod +x \"" + appPath + "/AketsukyUpdaterTEMP.sh" + "\"");
                //powershell -command "start-process \"E:\\WorkSpaces\\Visual Studio\\AketsukyUpdater\\AketsukyUpdater\\bin\\Debug\\AketsukyUpdater.exe\" -ArgumentList \"--move-files\", \"--app=AyMusic\" "
                let bat = spawn(appPath + "/AketsukyUpdaterTEMP.sh", [
                    "--move-files",
                    "--app",
                    "aymusic",
                    //    "< /dev/null &> /dev/null & disown"
                ], {
                    detached: true,
                    //stdio: 'ignore',
                    shell: "/bin/bash"
                });
                bat.unref()
                bat.stdout.on("data", (data) => {
                    console.log(data.toString())
                });

                bat.stderr.on("data", (err) => {
                    console.log(err.toString())
                });

                bat.on("exit", (code) => {
                    console.log(code)
                    configUpdate.closing = true
                    win.close()
                    //process.kill(process.pid)
                });
            }
            //other platforms goes here
            else {
                //we don't have an updater on this platform, so we block the app
                win.webContents.send('update-state-change', {
                    step: -2,
                    error: "Your OS is not compatible with AyMusic. Sorry :(",
                    file: null,
                    cur: 0,
                    max: 1
                })
            }
        }
    }
    catch (e) {
        console.error(e)
        win.webContents.send('update-state-change', {
            step: -2,
            error: e,
            file: null,
            cur: 0,
            max: 1
        })
    }
    process.noAsar = false
}

module.exports.configUpdate = configUpdate;
module.exports.searchUpdates = searchUpdates;