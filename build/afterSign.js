require('dotenv').config();

exports.default = function (context) {
  const { execSync } = require('child_process')
  if (process.platform === 'darwin') {
    console.log('Creating output md5')
    execSync('python3 ./build/md5output.py ' + [null, "mac-universal-x64-temp", null, "mac-universal-arm64-temp", "mac-universal"][context.arch] + ' -B')
    console.log('md5 complete')
    // Get context vars
    const appName = context.packager.appInfo.productFilename
    const appDir = context.appOutDir

    if (process.env.APPLETEAMID && process.env.APPLEID && process.env.APPLEIDPASS) {
      console.log('Notarizing')
      const { notarize } = require('@electron/notarize')
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
      console.log('Skipping notarization, APPLETEAMID, APPLEID and APPLEIDPASS are not set')
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