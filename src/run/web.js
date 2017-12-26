const { tmpDistDir } = require('../config')
const { boxLog, spawn } = require('../utils')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
/**
 * Start web service
 * @param {Object} options
 */
function runWeb (options) {
  const weweb = JSON.stringify(
    path.resolve(__dirname, '../../node_modules/weweb-cli/bin/weweb')
  )

  const buildWeb = [
    'node',
    weweb,
    options.appDir,
    '-b',
    '--nocheck',
    '-d',
    `${tmpDistDir}/web`
  ]

  console.log(buildWeb.join(' '))
  return spawn({ command: buildWeb })
}

module.exports = runWeb
