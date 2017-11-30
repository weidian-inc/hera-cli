const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
// const output = require('./output')
const validator = require('./validator')
const childProcess = require('child_process')
const boxen = require('boxen')
const { tmpDistDir } = require('../config')
const utils = {
  copyAndReplace (src, dest, replacements) {
    if (fs.lstatSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest)
      }
    } else {
      let content = fs.readFileSync(src, 'utf8')
      Object.keys(replacements).forEach(regex => {
        content = content.replace(new RegExp(regex, 'gm'), replacements[regex])
      })
      fs.writeFileSync(dest, content)
    }
  },

  /**
   * @param {String} directory
   * @return {Object} project info
   */
  findXcodeProject (dir) {
    if (!fs.existsSync(dir)) {
      return false
    }
    const files = fs.readdirSync(dir)
    const sortedFiles = files.sort()
    for (let i = sortedFiles.length - 1; i >= 0; i--) {
      const fileName = files[i]
      const ext = path.extname(fileName)

      if (ext === '.xcworkspace') {
        return {
          name: fileName,
          isWorkspace: true
        }
      }
      if (ext === '.xcodeproj') {
        return {
          name: fileName,
          isWorkspace: false
        }
      }
    }

    return null
  },

  parseIOSDevicesList (text) {
    const devices = []
    const REG_DEVICE = /(.*?) \((.*?)\) \[(.*?)]/

    const lines = text.split('\n')
    for (const line of lines) {
      if (
        line.indexOf('Watch') >= 0 ||
        line.indexOf('TV') >= 0 ||
        line.indexOf('iPad') >= 0
      ) {
        continue
      }
      const device = line.match(REG_DEVICE)
      if (device !== null) {
        const name = device[1]
        const version = device[2]
        const udid = device[3]
        const isSimulator =
          line.indexOf('Simulator') >= 0 || udid.indexOf('-') >= 0
        devices.push({ name, version, udid, isSimulator })
      }
    }

    return devices
  },
  parseDevicesResult (result) {
    if (!result) {
      return []
    }

    const devices = []
    const lines = result.trim().split(/\r?\n/)

    for (let i = 0; i < lines.length; i++) {
      let words = lines[i].split(/[ ,\t]+/).filter(w => w !== '')

      if (words[1] === 'device') {
        devices.push(words[0])
      }
    }
    return devices
  },
  spawn (opt) {
    const args = opt.command || "echo 'a oh'"
    const showLog = opt.showLog || true
    const msg = opt.msg || ''
    const opts = Object.assign(
      {
        shell: true,
        encoding: 'utf8',
        env: Object.assign({ FORCE_COLOR: true }, process.env)
      },
      opt.opts
    )
    const cmd = args[0]
    return new Promise((resolve, reject) => {
      try {
        let child = childProcess.spawn(cmd, args.slice(1), opts)
        child.stdout.on('data', function (data) {
          if (showLog) {
            process.stdout.write(data)
          }
        })
        child.stderr.on('data', data => {
          process.stdout.write(data)
          // process.stderr.write('\n' + chalk.yellow(data.toString().trim()))
        })
        child.on('error', err => {
          reject(err)
        })
        child.on('exit', code => {
          if (code === 0) {
            resolve(`child process exited with code ${code}`)
          } else {
            console.log(chalk.red('\n=====v====='))
            console.log(
              chalk.red(`Error executing: ${chalk.yellow(args.join(' '))}`)
            )
            if (msg) console.log(msg)
            console.log(chalk.red('=====^====='))
            reject(new Error(`child process exited with code ${code}`))
          }
        })
      } catch (e) {
        console.error('execute command failed :', args.join(' '))
        reject(e)
      }
    })
  },
  exec (command, showLog) {
    return new Promise((resolve, reject) => {
      try {
        let child = childProcess.exec(
          command,
          { encoding: 'utf8', maxBuffer: 5000 * 1024 },
          function (err, res) {
            if (err) reject(err)
            // console.log(res)
            resolve(res)
          }
        )

        child.stdout.on('data', function (data) {
          if (showLog) {
            process.stdout.write(data)
            // console.log(data)
          }
        })
      } catch (e) {
        console.error('execute command failed :', command)
        reject(e)
      }
    })
  },
  buildJS (options) {
    const weweb = JSON.stringify(
      path.resolve(__dirname, '../../node_modules/hera-weweb/bin/weweb')
    )

    let projDir = options.appDir

    const buildFramework = [
      'node',
      weweb,
      projDir,
      '-d',
      `${tmpDistDir}/framework`
    ]
    const buildDist = ['node', weweb, projDir, '-d', `${tmpDistDir}/app`]

    console.log(` => ${chalk.cyan.bold('start building app')}`)
    return utils
      .spawn({ command: buildDist })
      .then(res => {
        if (options.changeFramework) {
          console.log(` => ${chalk.cyan.bold('building framework')}`)
          return utils.spawn({ command: buildFramework })
        }
      })
      .then(() => console.log(` => ${chalk.cyan.bold('done building app')}`))
      .then(() => options)
      .catch(e => console.log(e))
  },
  getIOSProjectInfo (proj) {
    const args = `${proj.isWorkspace ? `-workspace` : `-project`} ${proj.name}`
    let projectInfoText = childProcess.execSync(`xcodebuild  -list ${args}`, {
      encoding: 'utf8'
    })
    let splits = projectInfoText.split(
      /Targets:|Build Configurations:|Schemes:/
    )
    let projectInfo = {}
    const projReg = /Information about project "([^"]+?)"/
    const workspaceReg = /Information about workspace "([^"]+?)"/
    projectInfo.name = splits[0].match(
      proj.isWorkspace ? workspaceReg : projReg
    )[1]
    // projectInfo.targets = splits[1]
    //   ? splits[1].split('\n').filter(e => !!e.trim()).map(e => e.trim())
    //   : []
    // projectInfo.configurations = splits[2]
    //   ? splits[2]
    //       .split('\n')
    //       .filter((e, i) => !!e.trim() && i < 3)
    //       .map(e => e.trim())
    //   : []
    projectInfo.schemes = splits[1]
      ? splits[1]
        .split('\n')
        .filter(e => !!e.trim())
        .map(e => e.trim())
      : []
    return { project: projectInfo }
  },
  copy (from, to) {
    return new Promise(function (resolve, reject) {
      fs.access(from, fs.F_OK, function (error) {
        if (error) {
          // reject(error)
          console.log(error)
        } else {
          const inputStream = fs.createReadStream(from)
          const outputStream = fs.createWriteStream(to)
          const rejectCleanup = error => {
            inputStream.destroy()
            outputStream.end()
            reject(error)
          }
          inputStream.on('error', rejectCleanup)
          outputStream.on('error', rejectCleanup)
          outputStream.on('finish', resolve)
          inputStream.pipe(outputStream)
        }
      })
    })
  },
  dashToCamel (str) {
    return str.replace(/(-[a-z])/g, function ($1) {
      return $1.toUpperCase().replace('-', '')
    })
  },
  isIOSProject: function (dir) {
    var result = this.findXcodeProject(dir)
    return result
  },
  isAndroidProject: function (dir) {
    if (fs.existsSync(path.join(dir, 'build.gradle'))) {
      return true
    }
  },
  boxLog: function (msg) {
    console.log(
      boxen(msg, {
        padding: 1,
        margin: 1,
        width: 200,
        borderStyle: 'double'
      })
    )
  }
}

module.exports = Object.assign(utils, validator)
