require('dotenv').config();
const { notarize } = require('@electron/notarize')

exports.default = function (context) {
  // Skip if not mac build
  if (process.platform === 'darwin') {
    // Get context vars
    const appName = context.packager.appInfo.productFilename
    const appDir = context.appOutDir

    if(process.env.APPLETEAMID && process.env.APPLEID && process.env.APPLEIDPASS) {
      console.log('Notarizing')
      // Notarize
      return notarize({
        appBundleId: 'com.aketsuky.aymusic',
        appPath: `${appDir}/${appName}.app`,
        tool: 'notarytool',
        teamId: process.env.APPLETEAMID,
        appleId: process.env.APPLEID,
        appleIdPassword: process.env.APPLEIDPASS,
      })
    }
    else {
      console.log('Skipping notarization, APPLETEAMID, APPLEID or APPLEIDPASS is not set')
    }
  } else if (process.platform === 'win32') {
    // VMP sign via EVS
    const { execSync } = require('child_process')
    console.log('VMP signing start')
    execSync('python -m castlabs_evs.vmp sign-pkg ./dist/win-unpacked')
    console.log('VMP signing complete')
    execSync("copy .\\build\\updaters\\win\\* .\\dist\\win-unpacked\\")
    console.log('Creating output md5')
    execSync('python ./build/md5output.py win -B')
    console.log('md5 complete')
  }
}