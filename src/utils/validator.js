const fs = require('fs')
const path = require('path')
const { platformDir } = require('../config')
const chalk = require('chalk')
const pify = require('pify')
const whichOri = require('which')
const which = pify(whichOri)

/**
 * Verifies this is an Android project
 * @param {String} root directory path
 */
function checkAndroid (cwd) {
  return fs.existsSync(path.join(cwd, `${platformDir}/android/gradlew`))
}

async function checkAndroidEnv (opts) {
  const cmds = ['Java', 'adb', 'git']
  const suggestions = ['请安装 JDK', '请设置 Android Platforms Tool 环境变量', '请安装 Git']
  let errFlag = 0
  await Promise.all(
    cmds.map((cmd, idx) =>
      which(cmd).catch(
        () => (errFlag = console.log(chalk.red(suggestions[idx])) || 1)
      )
    )
  )
  if (errFlag) process.exit(1)
  return opts
}

async function checkIOSEnv (opts) {
  const cmds = ['pod', 'git', 'xcodebuild']
  const suggestions = ['请安装 cocoapods', '请安装 Git', '请安装 xcode command tool']
  let errFlag = 0
  await Promise.all(
    cmds.map((cmd, idx) =>
      which(cmd).catch(
        () => (errFlag = console.log(chalk.red(suggestions[idx])) || 1)
      )
    )
  )
  if (errFlag) process.exit(1)
  return opts
}

/**
 * Verifies there has a ios folder
 * @param {String} root directory path
 */
function checkIOS (cwd) {
  // return fs.existsSync(path.join(cwd, 'ios/playground'))
  return fs.existsSync(path.join(cwd, `${platformDir}/ios`))
}

/**
 * Check if current cli is running on Windows platform
 */
function isOnWindows () {
  return /^win/.test(process.platform)
}

/**
 * Check if current cli is running on OSX platform
 */
function isOnMac () {
  return process.platform === 'darwin'
}

/**
 * Check if current cli is running on Linux platform
 */
function isOnLinux () {
  return process.platform === 'linux'
}

function isValidPackageName (name) {
  return name.match(/^[$A-Z_][0-9A-Z_$]*$/i)
}

module.exports = {
  checkAndroid,
  checkAndroidEnv,
  checkIOS,
  checkIOSEnv,
  isOnWindows,
  isOnMac,
  isOnLinux,
  isValidPackageName
}
