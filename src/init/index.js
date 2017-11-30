const chalk = require('chalk')
const fs = require('fs')
const fse = require('fs-extra')
const { resolve } = require('path')
const { boxLog } = require('../utils')

/**
 * Initialize a standard hera project
 * @param {String} project name
 * @param {String} config file path
 */
function init (projectName, configFile) {
  console.log(
    ` => ${chalk.cyan('Initialize a new Hera app')} (${chalk.blue(
      projectName
    )})`
  )
  const srcPath = resolve(__dirname, 'templates')
  const distPath = resolve(process.cwd(), projectName)

  const wxAppDir = 'dist'
  const doneCallback = () => {
    fs.writeFileSync(
      resolve(distPath, 'config.json'),
      JSON.stringify({ dir: wxAppDir }, 4)
    )
    fs.writeFileSync(resolve(distPath, '.gitignore'), 'heraTmp')
    console.log(
      ` => ${chalk.cyan('Initialization has been successfully completed')}`
    )
    const msg =
      `${chalk.cyan(`Go to your project:`)} ${chalk.yellow(
        `cd ${projectName}`
      )} \n` +
      `${chalk.cyan('Run on browser:')} ${chalk.yellow('hera run web')} \n` +
      `${chalk.cyan('Run on android:')} ${chalk.yellow(
        'hera run android'
      )} \n` +
      `${chalk.cyan('Run on ios:')} ${chalk.yellow('hera run ios')}`
    boxLog(msg)
  }
  fse.copy(srcPath, resolve(distPath, wxAppDir)).then(doneCallback)
}

module.exports = init
