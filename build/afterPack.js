exports.default = function (context) {
  const { execSync } = require('child_process')
  var platform = process.platform
  if (platform == "darwin") platform = "mac"
  if (platform == "win32") platform = "win"
  if (platform == "linux") platform = "linux"
  if (process.platform === 'darwin') {
    // VMP sign via EVS
    console.log('VMP signing start')
    execSync('python3 -m castlabs_evs.vmp sign-pkg ./dist/mac ' + context.appOutDir)
    console.log('VMP signing complete')
    console.log('Creating output md5')
    execSync('python3 ./build/md5output.py mac -B')
    console.log('md5 complete')
  }
  else if (process.platform === "linux") {
    execSync("cp ./build/updaters/" + platform + "/* ./dist/" + platform + "-unpacked/")
    console.log('Creating output md5')
    execSync('python3 ./build/md5output.py linux -B')
    console.log('md5 complete')
  }
}