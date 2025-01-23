var adblockList = []

function addBlockRequest(url, includes) {
    adblockList.push({
        url: url,
        includes: includes
    })
}

function isBadUrl(url) {
    for (let i = 0; i < adblockList.length; i++) {
        if ((adblockList[i].includes && url.includes(adblockList[i].url)) || url === adblockList[i].url) {
            return true
        }
    }
    return false
}

module.exports.adblockList = adblockList
module.exports.addBlockRequest = addBlockRequest
module.exports.isBadUrl = isBadUrl