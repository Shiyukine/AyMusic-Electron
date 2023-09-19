const {
    ipcRenderer,
    contextBridge,
    remote,
    net,
    app,
    dialog
} = require("electron");

contextBridge.exposeInMainWorld("boundobject", {
    getSettingFile: () => {
        return ipcRenderer.sendSync("get-settings", "UserSettings.json")
    },
    getUserSettingsFile: (file) => {
        return ipcRenderer.sendSync("get-settings", file)
    },
    changeSettingFile: (newSettings) => {
        return ipcRenderer.send("write-settings", {
            file: "UserSettings.json",
            data: JSON.parse(newSettings)
        })
    },
    changeUserSettingsFile: (file, newSettings) => {
        return ipcRenderer.send("write-settings", {
            file: file,
            data: JSON.parse(newSettings)
        })
    },
    httpRequestGET: (url) => {
        return ipcRenderer.invoke("custom-fetch", { url: url, config: undefined })
    },
    httpRequestPOST: (url, json) => {
        return ipcRenderer.invoke("custom-fetch", {
            url: url,
            config: {
                method: "POST",
                body: JSON.stringify(json)
            }
        })
    },
    changeServURL: (url) => {
        ipcRenderer.send("change-serv", url)
    },
    addIgnoreTouch: (el) => {
        el.addEventListener('mouseenter', () => {
            ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
        })
        el.addEventListener('mouseleave', () => {
            ipcRenderer.send('set-ignore-mouse-events', false)
        })
    },
    modifyIgnoreTouch: (id, x, y, widht, height, isVisible) => {

    },
    removeIgnoreTouch: (id) => {

    },
    refreshApp: () => {

    },
    closeWindow: () => {
        ipcRenderer.send("close-window")
    },
    restartApp: () => {
        ipcRenderer.send("restart-window")
    },
    hideWindow: () => {
        ipcRenderer.send("minimize-window")
    },
    getWindowState: () => {
        return ipcRenderer.sendSync("get-state-window")
    },
    maxWindow: () => {
        ipcRenderer.send("max-window")
    },
    normalWindow: () => {
        ipcRenderer.send("restore-window")
    },
    openLink: (url) => {
        ipcRenderer.send("open-link", url)
    },
    registerIframeUrl: (url, script) => {
        ipcRenderer.send("register-frame-url", { url: url, code: script })
    },
    pickUpMusic: () => {
        return ipcRenderer.sendSync("show-dialog")
    },
    saveCache: (fileName, bytes) => {
        return ipcRenderer.invoke("save-cache", { fileName: fileName, bytes: bytes })
    },
    saveData: (fileName, bytes) => {
        return ipcRenderer.invoke("save-data", { fileName: fileName, bytes: bytes })
    },
    openWebsiteInNewWindow: (baseUrl, closeUrl = undefined, useIncludeUrlFilter = true) => {
        ipcRenderer.send("open-website", { baseUrl: baseUrl, closeUrl: closeUrl, useIncludeUrlFilter: useIncludeUrlFilter })
    },
    getClientToken: (key) => {
        return ipcRenderer.sendSync("client-token", key)
    },
    removeClientToken: (key) => {
        ipcRenderer.send("rm-client-token", key)
    },
    discordRPC: (args) => {
        ipcRenderer.send("discord-rpc", args)
    },
    onUpdateStateChange: (cb) => {
        ipcRenderer.on("update-state-change", (event, args, options) => {
            cb(args)
        })
    },
    searchUpdates: () => {
        ipcRenderer.send("search-updates")
    },
    haveCookie: (url, name) => {
        return ipcRenderer.sendSync("have-cookie", { url: url, name: name })
    }
});