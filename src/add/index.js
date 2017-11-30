const { spawn, checkIOS, checkAndroid, boxLog } = require('../utils')
const { iOSRepo, androidRepo, platformDir } = require('../config')
const fse = require('fs-extra')
const chalk = require('chalk')

let downloading = true
let timer = null
module.exports = function (options) {
  const platform = options.platform
  console.log(` => ${chalk.cyan.bold(`start: adding platform (${platform})`)}`)
  const isIOS = platform === 'ios'
  const check = isIOS ? checkIOS : checkAndroid
  const distDir = `${platformDir}/${isIOS ? 'ios' : 'android'}`
  const repo = isIOS ? iOSRepo : androidRepo
  // const configFilePath = isIOS ? iosConfigFile : androidConfigFile
  // const frameworkSrc = `${tmpDistDir}/framework/framework`
  // const frameworkDist = isIOS
  //   ? `${platformDir}/ios/WDHodoer/WDHodoerDemo/WDHodoerRes.bundle/framework.zip`
  //   : `${platformDir}/android/hera/src/main/assets/hera.zip`
  // function editConfigFile (configFilePath, port) {
  //   const urls = [

  //   ]
  //   const ipAddr = ip.address()
  //   return readFileAsync(configFilePath)
  //     .then(file =>
  //       writeFileAsync(
  //         configFilePath,
  //         urls.reduce(
  //           (pre, currItem) =>
  //             pre.replace(
  //               currItem,
  //               `http://${ipAddr}:${port}/getOnlineFileByappId.json`
  //             ),
  //           file.toString()
  //         )
  //       )
  //     )
  //     .then(() => {
  //       if (options.changeFramework) return copy(frameworkSrc, frameworkDist)
  //     })
  // }

  const cmd = ['git', 'clone', repo, distDir]
  if (check(process.cwd())) {
    console.log(` => ${chalk.cyan.bold(`Platform Exists (${platform})`)}`)
    return Promise.resolve()
    // return editConfigFile(configFilePath, options.port || defaultPort)
  } else {
    return (
      fse
        .mkdirp(platformDir)
        .then(() => {
          timer = setInterval(() => {
            if (downloading) {
              process.stdout.write('.')
            } else {
              clearInterval(timer)
            }
          }, 2000)
          return spawn({ command: cmd, showLog: true })
        })
        // .then(() => editConfigFile(configFilePath, options.port || defaultPort))
        .then(() => {
          downloading = false
          console.log(
            `\n => ${chalk.cyan.bold(`done: adding platform (${platform})`)}`
          )
        })
        .then(() => true)
        .catch(e => {
          console.log(`\n => ${chalk.red.bold(e)}`)

          const msg =
            chalk.red.bold(`Error downloading platform ${platform}, try:\n`) +
            chalk.yellow.bold(cmd.join(' '))
          boxLog(msg)
          process.exit(1)
        })
    )
  }
}
