**In @cliqz/adblocker-electron/dist/cjs** 

```js
"use strict";
/*!
 * Copyright (c) 2017-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function (m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectronBlocker = exports.BlockingContext = exports.fromElectronDetails = void 0;
const electron_1 = require("electron");
const tldts_experimental_1 = require("tldts-experimental");
const adblocker_1 = require("@cliqz/adblocker");
const PRELOAD_PATH = require.resolve('@cliqz/adblocker-electron-preload');
var { codeInjecter } = require("../../../../../boundobject.js")
// https://stackoverflow.com/questions/48854265/why-do-i-see-an-electron-security-warning-after-updating-my-electron-project-t
// tslint:disable no-string-literal
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
/**
 * Create an instance of `Request` from `Electron.OnBeforeRequestDetails`.
 */
function fromElectronDetails(details) {
    const { id, url, resourceType, referrer, webContentsId } = details;
    return adblocker_1.Request.fromRawDetails(webContentsId
        ? {
            _originalRequestDetails: details,
            requestId: `${id}`,
            sourceUrl: referrer,
            tabId: webContentsId,
            type: (resourceType || 'other'),
            url,
        }
        : {
            _originalRequestDetails: details,
            requestId: `${id}`,
            sourceUrl: referrer,
            type: (resourceType || 'other'),
            url,
        });
}
exports.fromElectronDetails = fromElectronDetails;
/**
 * This abstraction takes care of blocking in one instance of `Electron.Session`.
 */
class BlockingContext {
    constructor(session, blocker) {
        this.session = session;
        this.blocker = blocker;
        this.onBeforeRequest = (details, callback) => blocker.onBeforeRequest(details, callback);
        this.onGetCosmeticFiltersFirst = (event, url) => blocker.onGetCosmeticFiltersFirst(event, url);
        this.onGetCosmeticFiltersUpdated = (event, url, msg) => blocker.onGetCosmeticFiltersUpdated(event, url, msg);
        this.onHeadersReceived = (details, callback) => blocker.onHeadersReceived(details, callback);
        this.onIsMutationObserverEnabled = (event) => blocker.onIsMutationObserverEnabled(event);
    }
    enable() {
        if (this.blocker.config.loadCosmeticFilters === true) {
            this.session.setPreloads(this.session.getPreloads().concat([PRELOAD_PATH]));
            electron_1.ipcMain.on('get-cosmetic-filters-first', this.onGetCosmeticFiltersFirst);
            electron_1.ipcMain.on('get-cosmetic-filters', this.onGetCosmeticFiltersUpdated);
            electron_1.ipcMain.on('is-mutation-observer-enabled', this.onIsMutationObserverEnabled);
        }
        if (this.blocker.config.loadNetworkFilters === true) {
            this.session.webRequest.onHeadersReceived({ urls: ['<all_urls>'] }, this.onHeadersReceived);
            this.session.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, this.onBeforeRequest);
        }
    }
    disable() {
        if (this.blocker.config.loadNetworkFilters === true) {
            // NOTE - there is currently no support in Electron for multiple
            // webRequest listeners registered for the same event. This means that
            // adblocker's listeners can be overriden by other ones in the same
            // application (or that the adblocker can override another listener
            // registered previously). Because of this, the only way to disable the
            // adblocker is to remove all listeners for the events we are interested
            // in. In the future, we should consider implementing a webRequest
            // pipeline allowing to register multiple listeners for the same event.
            this.session.webRequest.onHeadersReceived(null);
            this.session.webRequest.onBeforeRequest(null);
        }
        if (this.blocker.config.loadCosmeticFilters === true) {
            this.session.setPreloads(this.session.getPreloads().filter((p) => p !== PRELOAD_PATH));
            electron_1.ipcMain.removeListener('get-cosmetic-filters', this.onGetCosmeticFiltersUpdated);
        }
    }
}
exports.BlockingContext = BlockingContext;
/**
 * Wrap `FiltersEngine` into a Electron-friendly helper class. It exposes
 * methods to interface with Electron APIs needed to block ads.
 */
class ElectronBlocker extends adblocker_1.FiltersEngine {
    constructor() {
        super(...arguments);
        this.contexts = new WeakMap();
        // ----------------------------------------------------------------------- //
        // ElectronBlocker-specific additions to FiltersEngine
        // ----------------------------------------------------------------------- //
        this.onIsMutationObserverEnabled = (event) => {
            event.returnValue = this.config.enableMutationObserver;
        };
        this.onGetCosmeticFiltersFirst = (event, url) => {
            // Extract hostname from sender's URL
            const parsed = (0, tldts_experimental_1.parse)(url);
            const hostname = parsed.hostname || '';
            const domain = parsed.domain || '';
            const { active, styles, scripts, extended } = this.getCosmeticsFilters({
                domain,
                hostname,
                url,
                // This needs to be done only once per frame
                getBaseRules: true,
                getInjectionRules: true,
                getExtendedRules: true,
                getRulesFromHostname: true,
            });
            if (active === false) {
                event.returnValue = null;
                return;
            }
            // Inject custom stylesheets
            this.injectStyles(event.sender, styles);
            event.sender.send('get-cosmetic-filters-response', {
                active,
                extended,
                styles: '',
            });
            // to execute Inject scripts synchronously, simply return scripts to renderer.
            event.returnValue = scripts;
        };
        this.onGetCosmeticFiltersUpdated = (event, url, msg) => {
            // Extract hostname from sender's URL
            const parsed = (0, tldts_experimental_1.parse)(url);
            const hostname = parsed.hostname || '';
            const domain = parsed.domain || '';
            const { active, styles, extended } = this.getCosmeticsFilters({
                domain,
                hostname,
                url,
                classes: msg.classes,
                hrefs: msg.hrefs,
                ids: msg.ids,
                // This will be done every time we get information about DOM mutation
                getRulesFromDOM: true,
            });
            if (active === false) {
                return;
            }
            // Inject custom stylesheets
            this.injectStyles(event.sender, styles);
            // Inject scripts from content script
            event.sender.send('get-cosmetic-filters-response', {
                active,
                extended,
                styles: '',
            });
        };
        this.onHeadersReceived = (details, callback) => {
            const CSP_HEADER_NAME = 'content-security-policy';
            const policies = [];
            const responseHeaders = details.responseHeaders || {};
            if (!responseHeaders["Access-Control-Allow-Credentials".toLowerCase()]) {
                for (let i in responseHeaders) {
                    if (i.toLowerCase() == "access-control-allow-origin") delete responseHeaders[i]
                }
                responseHeaders["access-control-allow-origin"] = "*"
            }
            delete responseHeaders['x-frame-options']
            delete responseHeaders['content-security-policy-report-only']
            delete responseHeaders['content-security-policy']
            if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame' || (details.url.includes("deezer.com") && details.resourceType === 'xhr')) {
                const rawCSP = this.getCSPDirectives(fromElectronDetails(details));
                if (details.url.includes("spotify.com") || details.url.includes("google.com") || details.url.includes("youtube.com")) {
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
                                const code = "if(typeof intytb == 'undefined') { let intytb = setInterval(() => { if(typeof scriptLoad == 'undefined') { try { document.getElementsByTagName('video')[0].pause(); } catch(e) {  } } else { clearInterval(intytb); } }, 1) }"
                                frame.executeJavaScript(code)
                            }
                        }
                    }
                }
                //
                if (rawCSP !== undefined) {
                    policies.push(...rawCSP.split(';').map((csp) => csp.trim()));
                    // Collect existing CSP headers from response
                    for (const [name, values] of Object.entries(responseHeaders)) {
                        if (name.toLowerCase() === CSP_HEADER_NAME) {
                            policies.push(...values);
                            delete responseHeaders[name];
                        }
                    }
                    responseHeaders[CSP_HEADER_NAME] = [policies.join(';')];
                    callback({ responseHeaders });
                    return;
                }
            }
            callback({ responseHeaders });
        };
        this.onBeforeRequest = (details, callback) => {
            const request = fromElectronDetails(details);
            if (this.config.guessRequestTypeFromUrl === true && request.type === 'other') {
                request.guessTypeOfRequest();
            }
            if (request.isMainFrame()) {
                callback({});
                return;
            }
            const { redirect, match } = this.match(request);
            if (redirect) {
                callback({ redirectURL: redirect.dataUrl });
            }
            else if (match) {
                callback({ cancel: true });
            }
            else {
                callback({});
            }
        };
    }
    // ----------------------------------------------------------------------- //
    // Helpers to enable and disable blocking for 'browser'
    // ----------------------------------------------------------------------- //
    enableBlockingInSession(session) {
        let context = this.contexts.get(session);
        if (context !== undefined) {
            return context;
        }
        // Create new blocking context for `session`
        context = new BlockingContext(session, this);
        this.contexts.set(session, context);
        context.enable();
        return context;
    }
    disableBlockingInSession(session) {
        const context = this.contexts.get(session);
        if (context === undefined) {
            throw new Error('Trying to disable blocking which was not enabled');
        }
        this.contexts.delete(session);
        context.disable();
    }
    isBlockingEnabled(session) {
        return this.contexts.has(session);
    }
    injectStyles(sender, styles) {
        if (styles.length > 0) {
            sender.insertCSS(styles, {
                cssOrigin: 'user',
            });
        }
    }
}
exports.ElectronBlocker = ElectronBlocker;
// re-export @cliqz/adblocker symbols for convenience
__exportStar(require("@cliqz/adblocker"), exports);
//# sourceMappingURL=adblocker.js.map
```