**In @cliqz/adblocker-electron/dist/cjs** 
_Line 174_

```js
//AyMusic code
delete responseHeaders['x-frame-options']
delete responseHeaders['content-security-policy-report-only']
if (details.url.includes("spotify.com")) {
    for (let i in responseHeaders["set-cookie"]) {
        if (responseHeaders["set-cookie"][i].includes("SameSite=Lax")) {
            responseHeaders["set-cookie"][i] = responseHeaders["set-cookie"][i].split("SameSite=Lax").join("SameSite=None; Secure")
        }
        else {
            responseHeaders["set-cookie"][i] += "; SameSite=None"
        }
    }
    responseHeaders["access-control-allow-origin"] = "*"
    delete responseHeaders['content-security-policy']
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
```