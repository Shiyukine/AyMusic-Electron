const crypto = require('crypto');
const { app, BrowserWindow, net, shell } = require('electron');
const electronDl = require('electron-dl');
const fs = require('fs');
const path = require('path');
const { resolve } = require('path');
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
    versionName: "0.1.0",
    versionCode: 1
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
        let dl = await electronDl.download(win, dlPathServ.split("%platform%").join(platform).split("%file%").join(file), {
            directory: appPath + "/DownloadTemp/",
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
    })
}

const searchUpdates = async (event) => {
    process.noAsar = true
    let appPath = path.dirname(app.getPath("exe"))
    fs.rm(appPath + "/AketsukyUpdaterTEMP.exe", () => { })
    let win = BrowserWindow.fromWebContents(event.sender)
    try {
        win.webContents.send('update-state-change', {
            step: 0,
            file: configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json",
            cur: 0,
            max: 100
        })
        var platform = process.platform
        if (platform == "darwin") platform = "macos"
        if (platform == "win32") platform = "windows"
        if (platform == "linux") platform = "linux"
        let out = await (await net.fetch(configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json?date=" + Date.now())).text()
        win.webContents.send('update-state-change', {
            step: 0,
            file: configUpdate.servUrl + "/dl/AyMusic/update_" + platform + ".json",
            cur: 50,
            max: 100
        })
        if (out) out = JSON.parse(out)
        let dlPathServ = out["***INFOS***"]
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
        let files = await getFiles(appPath)
        let clientJsonOut = {}
        for (let i in files) {
            let file = files[i]
            try {
                clientJsonOut[path.basename(file)] = await getChecksum(file)
                win.webContents.send('update-state-change', {
                    step: 1,
                    file: file,
                    cur: i,
                    max: files.length - 1
                })
            }
            catch (e) {
                console.log(e)
            }
        }
        //console.log(JSON.stringify(clientJsonOut))
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
                //powershell -command "start-process \"E:\\WorkSpaces\\Visual Studio\\AketsukyUpdater\\AketsukyUpdater\\bin\\Debug\\AketsukyUpdater.exe\" -ArgumentList \"--move-files\", \"--app=AyMusic\" "
                let cmd = "start-process \"" + appPath.split("\\").join("\\\\") + "\\\\AketsukyUpdaterTEMP.exe\" -ArgumentList \"--move-files\", \"--app=AyMusic\""
                console.log(cmd)
                let bat = spawn("powershell", [
                    "-command",
                    cmd,
                ]);
                bat.stdout.on("data", (data) => {
                    console.log(data.toString())
                });

                bat.stderr.on("data", (err) => {
                    console.log(err.toString())
                });

                bat.on("exit", (code) => {
                    console.log(code)
                    win.close()
                });
            }
            //other platforms goes here
            else {
                //we don't have an updater on this platform, so we will skip this update
                win.webContents.send('update-state-change', {
                    step: -1,
                    file: null,
                    cur: 1,
                    max: 1
                })
            }
        }
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
    process.noAsar = false
}

module.exports.configUpdate = configUpdate;
module.exports.searchUpdates = searchUpdates;