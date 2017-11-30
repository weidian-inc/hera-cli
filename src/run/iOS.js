const path = require('path')
const chalk = require('chalk')
const childProcess = require('child_process')
const inquirer = require('inquirer')
const {
  buildJS,
  spawn,
  checkIOSEnv,
  findXcodeProject,
  parseIOSDevicesList,
  boxLog,
  copy
} = require('../utils')
const addPlatform = require('../add')
// const startJSServer = require('../utils/server')
const { iosProjDir, iosScheme, tmpDistDir } = require('../config')
/**
 * Run iOS app
 * @param {Object} options
 */
function runIOS (options) {
  checkIOSEnv(options)
    .then(buildJS)
    // .then(startJSServer)
    .then(prepareIOS)
    .then(({ xcodeProject, options, rootPath }) => {
      const appSrc = `../../${tmpDistDir}/app/app.zip`
      const appDist = `HeraDemo/demoapp.zip`
      return copy(appSrc, appDist).then(() => ({
        xcodeProject,
        options,
        rootPath
      }))
    })
    .then(installDep)
    .then(findIOSDevice)
    .then(chooseDevice)
    .then(buildApp)
    .then(runApp)
    .then(() => boxLog(`${chalk.cyan.bold(`Done, try it on your device.`)}`))
    .catch(err => {
      if (err) {
        try {
          if (err.stderr) {
            console.log(err.stderr)
          } else {
            console.log(err)
          }
          if (err.output) console.log(err.output.join('\n'))
        } catch (e) {
          console.log(e)
        }
      }
    })
}

/**
 * Prepare
 * @param {Object} options
 */
function prepareIOS (options) {
  return addPlatform(options).then(
    () =>
      new Promise((resolve, reject) => {
        const rootPath = process.cwd()

        // change working directory to ios
        process.chdir(path.join(rootPath, iosProjDir))

        const xcodeProject = findXcodeProject(process.cwd())

        if (xcodeProject) {
          console.log()
          console.log(` => ${chalk.cyan.bold('Will start iOS app')}`)
          resolve({ xcodeProject, options, rootPath })
        } else {
          console.log()
          console.log(
            `  ${chalk.red.bold(
              'Could not find Xcode project files in ios folder'
            )}`
          )
          console.log()
          console.log(
            `  Please make sure you have installed iOS Develop Environment and CocoaPods`
          )
          console.log(
            `  See ${chalk.blue(
              'https://weidian-inc.github.io/hera/#/basics/quickstart'
            )}`
          )
          reject(new Error('Could not find Xcode project files in ios folder'))
        }
      })
  )
}

/**
 * Install dependency
 * @param {Object} xcode project
 * @param {Object} options
 */
function installDep ({ xcodeProject, options, rootPath }) {
  console.log(` => ${chalk.cyan.bold('Installing Pod Dependencies')}`)
  const msg =
    '请先使用如下命令安装 cocoapods\n' +
    'sudo gem install cocoapods\n' +
    '参考：https://weidian-inc.github.io/hera/#/basics/quickstart'
  return (
    spawn({ command: ['pod', 'update'], msg: chalk.yellow(msg) })
      // .then(() =>
      //   spawn({ command: 'pod install' })
      // )
      .then(() => ({
        xcodeProject,
        options,
        rootPath
      }))
  )
}

/**
 * find ios devices
 * @param {Object} xcode project
 * @param {Object} options
 * @return {Array} devices lists
 */
function findIOSDevice ({ xcodeProject, options, rootPath }) {
  return new Promise((resolve, reject) => {
    let deviceInfo = ''
    try {
      deviceInfo = childProcess.execSync('xcrun instruments -s devices', {
        encoding: 'utf8'
      })
    } catch (e) {
      reject(e)
    }
    let devicesList = parseIOSDevicesList(deviceInfo)
    resolve({ devicesList, xcodeProject, options, rootPath })
  })
}

/**
 * Choose one device to run
 * @param {Array} devicesList: name, version, id, isSimulator
 * @param {Object} xcode project
 * @param {Object} options
 * @return {Object} device
 */
function chooseDevice ({ devicesList, xcodeProject, options, rootPath }) {
  return new Promise((resolve, reject) => {
    if (devicesList && devicesList.length > 0) {
      const listNames = [new inquirer.Separator(' = devices = ')]
      for (const device of devicesList) {
        listNames.push({
          name: `${device.name} ios: ${device.version}`,
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
          resolve({ device, xcodeProject, options, rootPath })
        })
    } else {
      reject(new Error('No ios devices found.'))
    }
  })
}

/**
 * build the iOS app on simulator or real device
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function buildApp ({ device, xcodeProject, options, rootPath }) {
  return new Promise((resolve, reject) => {
    // let projectInfo = ''
    // try {
    //   projectInfo = getIOSProjectInfo(xcodeProject)
    // } catch (e) {
    //   reject(e)
    // }

    // const scheme = projectInfo.project.schemes[1]
    const scheme = iosScheme

    if (device.isSimulator) {
      _buildOnSimulator({
        scheme,
        device,
        xcodeProject,
        options,
        resolve,
        reject,
        rootPath
      })
    } else {
      _buildOnRealDevice({
        scheme,
        device,
        xcodeProject,
        options,
        resolve,
        reject,
        rootPath
      })
    }
  })
}

/**
 * build the iOS app on simulator
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function _buildOnSimulator ({
  scheme,
  device,
  rootPath,
  xcodeProject,
  options,
  resolve,
  reject
}) {
  console.log('project is building ...')
  try {
    const schemeArg = scheme ? `-scheme ${scheme}` : ''

    const cmd = `xcodebuild -${xcodeProject.isWorkspace
      ? 'workspace'
      : 'project'} ${xcodeProject.name} ${schemeArg} -configuration Debug -destination id=${device.udid} -sdk iphonesimulator -derivedDataPath build clean build`
    spawn({ command: cmd.split(' ') }).then(() =>
      resolve({ device, xcodeProject, options })
    )
  } catch (e) {
    reject(e)
  }
}

/**
 * build the iOS app on simulator
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function _buildOnRealDevice ({
  scheme,
  device,
  rootPath,
  xcodeProject,
  options,
  resolve,
  reject
}) {
  console.log('project is building ...')
  // let buildInfo = ''
  try {
    var xcodebuildArgs = [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-configuration',
      'Debug',
      '-scheme',
      scheme,
      '-destination',
      `id=${device.udid}`,
      '-derivedDataPath',
      'build'
    ]

    // buildInfo =
    const msg =
      chalk.cyan('第一次构建需主动添加账号信息, 使用如下命令在 Xcode 中打开此项目') +
      '\n' +
      `open -a Xcode ${process.cwd()}/${xcodeProject.name}` +
      '\n' +
      '文档：https://weidian-inc.github.io/hera/#/ios/ios-real-device'

    spawn({ command: ['xcodebuild'].concat(xcodebuildArgs), msg })
      .then(() => resolve({ device, xcodeProject, options }))
      .catch(e => process.exit(1))
  } catch (e) {
    // boxLog(msg)
    reject(e)
  }
}

/**
 * Run the iOS app on simulator or device
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function runApp ({ device, xcodeProject, options }) {
  return new Promise((resolve, reject) => {
    if (device.isSimulator) {
      _runAppOnSimulator({ device, xcodeProject, options, resolve, reject })
    } else {
      _runAppOnDevice({ device, xcodeProject, options, resolve, reject })
    }
  })
}

/**
 * Run the iOS app on simulator
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function _runAppOnSimulator ({
  device,
  xcodeProject,
  options,
  resolve,
  reject
}) {
  const inferredSchemeName = path.basename(
    xcodeProject.name,
    path.extname(xcodeProject.name)
  )
  const appPath = `build/Build/Products/Debug-iphonesimulator/${inferredSchemeName}.app`
  const bundleID = childProcess
    .execFileSync(
      '/usr/libexec/PlistBuddy',
      ['-c', 'Print:CFBundleIdentifier', path.join(appPath, 'Info.plist')],
      { encoding: 'utf8' }
    )
    .trim()

  let simctlInfo = ''
  try {
    simctlInfo = childProcess.execSync('xcrun simctl list --json devices', {
      encoding: 'utf8'
    })
  } catch (e) {
    reject(e)
  }
  simctlInfo = JSON.parse(simctlInfo)

  if (!simulatorIsAvailable(simctlInfo, device)) {
    reject('simulator is not available!')
  }

  console.log(`Launching ${device.name}...`)

  try {
    childProcess.execSync(`xcrun instruments -w ${device.udid}`, {
      encoding: 'utf8'
    })
  } catch (e) {
    // instruments always fail with 255 because it expects more arguments,
    // but we want it to only launch the simulator
  }

  console.log(`Installing ${appPath}`)

  try {
    childProcess.execSync(`xcrun simctl install booted ${appPath}`, {
      encoding: 'utf8'
    })
  } catch (e) {
    reject(e)
  }

  try {
    childProcess.execSync(`xcrun simctl launch booted ${bundleID}`, {
      encoding: 'utf8'
    })
  } catch (e) {
    reject(e)
  }

  resolve()
}

/**
 * check simulator is available
 * @param {JSON} info simulator list
 * @param {Object} device user choose one
 * @return {boolean} simulator is available
 */
function simulatorIsAvailable (info, device) {
  info = info.devices
  const minorVer = device.version
    .split('.')
    .slice(0, 2)
    .join('.')
  let simList = info['iOS ' + minorVer]
  for (const sim of simList) {
    if (sim.udid === device.udid) {
      return sim.availability === '(available)'
    }
  }
}

/**
 * Run the iOS app on device
 * @param {Object} device
 * @param {Object} xcode project
 * @param {Object} options
 */
function _runAppOnDevice ({ device, xcodeProject, options, resolve, reject }) {
  const appPath = `build/Build/Products/Debug-iphoneos/HeraDemo.app`
  const deviceId = device.udid
  console.log('** INSTALLING APP **')

  const msg =
    '** INSTALLATION FAILED **\n' +
    '1. Make sure you have ios-deploy installed globally.\n' +
    '(e.g "npm install -g ios-deploy")\n' +
    '2. Make sure you have your iPhone unlocked.'
  const args = [
    '--justlaunch',
    '--id',
    deviceId,
    '--bundle',
    path.resolve(appPath)
  ]
  return spawn({
    command: ['ios-deploy'].concat(args),
    msg: chalk.cyan(msg)
  })
}

module.exports = runIOS
