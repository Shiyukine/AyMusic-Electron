exports.default = function (context) {
  if (process.platform === 'darwin') {
    // VMP sign via EVS
    const { execSync } = require('child_process')
    console.log('VMP signing start')
    execSync('py -m castlabs_evs.vmp sign-pkg ./dist/mac ' + context.appOutDir)
    console.log('VMP signing complete')
  }
  else if (process.platform === "linux") {
    const { execSync } = require('child_process')
    console.log('Creating output md5')
    execSync('python3 ./build/md5output.py linux -B')
    console.log('md5 complete')
  }
}