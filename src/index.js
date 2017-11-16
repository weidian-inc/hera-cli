const chalk = require('chalk')
const initProject = require('./init')
const runAndroid = require('./run/Android')
const addPlatform = require('./add')
const { boxLog } = require('./utils')
const runIOS = require('./run/iOS')
const runServer = require('./run/Server')
const runWeb = require('./run/web')
/**
 * Get current version
 */
function getVersion () {
  return require('./package.json').version
}

/**
 * Initialize a standard hera project
 * @param {String} project name
 * @param {String} config file path
 */
function init (projectName = '', configFile = '') {
  if (projectName.match(/^[$A2-Z_][0-9A-Z_-]*$/i)) {
    initProject(projectName, configFile)
  } else {
    console.log(
      `  ${chalk.red('Invalid project name:')} ${chalk.yellow(projectName)}`
    )
  }
}

/**
 * Run hera app on the specific platform
 * @param {String} platform
 */
function run (platform = '', options = {}) {
  platform = platform.toLocaleLowerCase()
  options.platform = platform
  switch (platform) {
    case 'android':
      runAndroid(options)
      break
    case 'ios':
      runIOS(options)
      break
    case 'server':
      runServer(options)
      break
    case 'web':
      runWeb(options)
      break
    default: {
      boxLog(`  ${chalk.red('Unknown platform:')} ${chalk.yellow(platform)}`)
    }
  }
}

/**
 * Run hera app on the specific platform
 * @param {String} platform
 */
function add (platform = '', options = {}) {
  platform = platform.toLocaleLowerCase()
  options.platform = platform
  return addPlatform(options)
}

module.exports = {
  getVersion,
  init,
  run,
  add,
  runAndroid,
  runIOS,
  runWeb
}
