exports.default = function (context) {
  const { execSync } = require('child_process')
  var platform = process.platform
  if (platform == "darwin") platform = "macos"
  if (platform == "win32") platform = "windows"
  if (platform == "linux") platform = "linux"
  execSync("cp ./build/updaters/" + platform + "/* ./dist/" + platform + "-unpacked/")
  if (process.platform === 'darwin') {
    // VMP sign via EVS
    console.log('VMP signing start')
    execSync('py -m castlabs_evs.vmp sign-pkg ./dist/mac ' + context.appOutDir)
    console.log('VMP signing complete')
  }
  else if (process.platform === "linux") {
    console.log('Creating output md5')
    execSync('python3 ./build/md5output.py linux -B')
    console.log('md5 complete')
  }
}