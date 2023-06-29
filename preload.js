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
    httpRequestGET: async (url) => {
        return ipcRenderer.sendSync("custom-fetch", { url: url, config: undefined })
    },
    httpRequestPOST: async (url, json) => {
        return ipcRenderer.sendSync("custom-fetch", {
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
    registerIframeUrl: (url, script) => {
        ipcRenderer.send("register-frame-url", { url: url, code: script })
    },
    pickUpMusic: () => {
        return ipcRenderer.sendSync("show-dialog")
    },
    saveCache: (fileName, bytes) => {
        ipcRenderer.send("save-cache", { fileName: fileName, bytes: bytes })
    },
    openWebsiteInNewWindow: (baseUrl, closeUrl = undefined) => {
        ipcRenderer.send("open-website", { baseUrl: baseUrl, closeUrl: closeUrl })
    },
    getClientToken: (key) => {
        return ipcRenderer.sendSync("client-token", key)
    }
});