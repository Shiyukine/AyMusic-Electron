const { notarize } = require('@electron/notarize')

exports.default = function (context) {
  // Skip if not mac build
  if (process.platform === 'darwin') {
    console.log('Notarizing')
    // Get contex vars
    const appName = context.packager.appInfo.productFilename
    const appDir = context.appOutDir

    // Notarize
    return notarize({
      appBundleId: 'com.aketsuky.aymusic',
      appPath: `${appDir}/${appName}.app`,
      appleId: process.env.appleId,
      appleIdPassword: process.env.appleIdPassword
    })
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