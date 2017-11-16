const { tmpDistDir } = require('../config')
const { boxLog, exec, spawn } = require('../utils')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
/**
 * Start web service
 * @param {Object} options
 */
function runWeb (options) {
  const weweb = path.resolve(
    __dirname,
    '../../node_modules/weweb-cli/bin/weweb'
  )

  let projDir = ''
  if (fs.existsSync('config.json')) {
    let content = fs.readFileSync('config.json', { encoding: 'utf8' })
    projDir = JSON.parse(content).dir
  } else {
    boxLog(
      chalk.yellow('cd to your project\n') +
        'or create config.json manually, fill it with: {"dir": "path/to/wxapp"}'
    )
  }

  const buildWeb = `${weweb} ${projDir} -d ${tmpDistDir}/web`
  console.log(buildWeb)
  return spawn({ command: buildWeb })
}

module.exports = runWeb
