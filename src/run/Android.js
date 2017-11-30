const path = require('path')
const chalk = require('chalk')
const childProcess = require('child_process')
const fs = require('fs')
const inquirer = require('inquirer')
const {
  checkAndroidEnv,
  buildJS,
  parseDevicesResult,
  copy,
  spawn,
  boxLog
} = require('../utils')
// const startJSServer = require('../utils/server')
const addPlatform = require('../add')
const {
  defaultPort,
  androidAPKName,
  androidManifestFile,
  androidMainActivity,
  tmpDistDir,
  platformDir
} = require('../config')

/**
 * Build and run Android app on a connected emulator or device
 * @param {Object} options
 */
function runAndroid (options) {
  checkAndroidEnv(options)
    .then(buildJS)
    // .then(startJSServer)
    .then(prepareAndroid)
    .then(({ options, rootPath }) => {
      const appSrc = `../../${tmpDistDir}/app/app.zip`
      const appDist = `app/src/main/assets/demoapp.zip`
      return copy(appSrc, appDist).then(() => ({ options, rootPath }))
    })
    .then(findAndroidDevice)
    .then(chooseDevice)
    // .then(reverseDevice)
    .then(buildApp)
    .then(installApp)
    .then(runApp)
    .then(() => boxLog(`${chalk.cyan.bold(`Done, try it on your device.`)}`))
    .catch(err => {
      console.log(chalk.red(err))
      process.exit(1)
    })
}

/**
 * Prepare
 * @param {Object} options
 */
function prepareAndroid (options) {
  return addPlatform(options)
    .then(
      () =>
        new Promise((resolve, reject) => {
          const rootPath = process.cwd()

          console.log(` => ${chalk.cyan.bold('Will start Android app')}`)

          // change working directory to android
          process.chdir(path.join(rootPath, `${platformDir}/android`))

          if (!process.env.ANDROID_HOME) {
            console.log(`  You should set $ANDROID_HOME first.`)
            console.log(
              `  See ${chalk.blue(
                'http://stackoverflow.com/questions/19986214/setting-android-home-enviromental-variable-on-mac-os-x'
              )}`
            )
            reject(
              new Error('  Environment variable $ANDROID_HOME not found !')
            )
          }
          try {
            childProcess.execSync(`adb start-server`, { encoding: 'utf8' })
          } catch (e) {
            reject(e)
          }
          try {
            childProcess.execSync(`adb devices`, { encoding: 'utf8' })
          } catch (e) {
            reject(e)
          }
          resolve({ options, rootPath })
        })
    )
    .catch(e => console.error(e))
}

/**
 * find android devices
 * @param {Object} options
 */
function findAndroidDevice ({ options }) {
  return new Promise((resolve, reject) => {
    let devicesInfo = ''
    try {
      devicesInfo = childProcess.execSync(`adb devices`, { encoding: 'utf8' })
    } catch (e) {
      console.log(
        chalk.red(
          `adb devices failed, please make sure you have adb in your PATH.`
        )
      )
      console.error(
        `See ${chalk.blue(
          'http://stackoverflow.com/questions/27301960/errorunable-to-locate-adb-within-sdk-in-android-studio'
        )}`
      )
      reject(e)
    }

    let devicesList = parseDevicesResult(devicesInfo)

    resolve({ devicesList, options })
  }).catch(e => console.error(e))
}

/**
 * Choose one device to run
 * @param {Array} devicesList: name, version, id, isSimulator
 * @param {Object} options
 */
function chooseDevice ({ devicesList, options }) {
  return new Promise((resolve, reject) => {
    if (devicesList && devicesList.length > 1) {
      const listNames = [new inquirer.Separator(' = devices = ')]
      for (const device of devicesList) {
        listNames.push({
          name: `${device}`,
          value: device
        })
      }

      inquirer
        .prompt([
          {
            type: 'list',
            message: 'Choose one of the following devices',
            name: 'chooseDevice',
            choices: listNames
          }
        ])
        .then(answers => {
          const device = answers.chooseDevice
          resolve({ device, options })
        })
    } else if (devicesList.length == 1) {
      resolve({ device: devicesList[0], options })
    } else {
      reject(new Error('No android devices found.'))
    }
  }).catch(e => {
    boxLog(chalk.yellow.bold('请连接安卓手机或开启安卓虚拟机'))
    process.exit(1)
  })
}

/**
 * Adb reverse device, allow device connect host network
 * @param {String} device
 * @param {Object} options
 */
function reverseDevice ({ device, options }) {
  const port = +options.port || defaultPort
  return new Promise((resolve, reject) => {
    try {
      // 现在可以从安卓上访问PC的网络，adb reverse 参数中第二个port为PC上应用监听的端口

      childProcess.execSync(
        `adb -s ${device} reverse tcp:${port} tcp:${port}`,
        {
          encoding: 'utf8'
        }
      )
      console.log(
        ` => ${chalk.cyan.bold(
          `Android device can access bundle on port ${port}`
        )}`
      )
    } catch (e) {
      console.error('reverse error[ignored]')
      resolve({ device, options })
    }

    resolve({ device, options })
  }).catch(e => console.error(e))
}

/**
 * Build the Android app
 * @param {String} device
 * @param {Object} options
 */
function buildApp ({ device, options }) {
  return new Promise((resolve, reject) => {
    console.log(` => ${chalk.cyan.bold('Building app ...')}`)
    if (!fs.existsSync('local.properties')) {
      try {
        const escapePath = text => {
          return text.replace(/[-[\]{}()*+?.,\\^$|#:\s]/g, '\\$&')
        }
        fs.writeFileSync(
          'local.properties',
          `sdk.dir=${escapePath(process.env.ANDROID_HOME)}`
        )
      } catch (e) {
        reject(e.message)
      }
    }

    try {
      const cmd = process.platform === 'win32' ? `gradlew.bat` : `./gradlew`
      let args = options.clean ? ['clean'] : []
      args.push('assemble')
      return spawn({
        command: [cmd].concat(args),
        showLog: true
      }).then(() =>
        resolve({
          device,
          options
        })
      )
    } catch (e) {
      reject(e.message)
    }
  })
  // .catch(e => console.error(e))
}

/**
 * Install the Android app
 * @param {String} device
 * @param {Object} options
 */
function installApp ({ device, options }) {
  return new Promise((resolve, reject) => {
    console.log(` => ${chalk.cyan.bold('Install app ...')}`)
    const apkName = androidAPKName

    try {
      childProcess.execSync(`adb -s ${device} install -r ${apkName}`, {
        encoding: 'utf8'
      })
    } catch (e) {
      if (~e.stderr.indexOf('INSTALL_FAILED_UPDATE_INCOMPATIBLE')) {
        boxLog(chalk.red('您已安装过该应用，但是签名不合，请删除重试'))
        process.exit(1)
      }
      reject(e)
    }

    resolve({ device, options })
  })
}

/**
 * Run the Android app on emulator or device
 * @param {String} device
 * @param {Object} options
 */
function runApp ({ device, options }) {
  return new Promise((resolve, reject) => {
    console.log(` => ${chalk.cyan.bold('Running app ...')}`)

    const packageName = fs
      .readFileSync(androidManifestFile, 'utf8')
      .match(/package="(.+?)"/)[1]
    const opts = [
      {
        key: 'debug',
        value: true
      }
    ]
    try {
      childProcess.execSync(
        `adb -s ${device} shell am start -n ${packageName}/.${androidMainActivity} ${opts.map(
          ({ key, value }) => `-e ${key} ${value}`
        )}`,
        { encoding: 'utf8' }
      )
    } catch (e) {
      reject(e)
    }

    resolve()
  })
}

module.exports = runAndroid
