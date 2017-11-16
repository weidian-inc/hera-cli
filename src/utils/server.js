const fs = require('fs')
const detectPort = require('detect-port')
const send = require('koa-send')
const Koa = require('koa')
const chalk = require('chalk')
const Router = require('koa-router')
const logger = require('koa-logger')
const koaBody = require('koa-body')
const md5 = require('md5')
const ip = require('ip')
const { defaultPort, tmpDistDir } = require('../config')
const promisify = require('pify')
const readFileAsync = promisify(fs.readFile)

/**
 * Init and start server
 *
 * @class Server
 */
class Server {
  constructor (port) {
    this.port = port
    this.app = new Koa()
    this.router = new Router()
    this.currentPath = process.cwd()
    this.inCurrentPath = false
    this.ip = ip.address()
    this.init()
  }

  init () {
    // path change middleware
    this.app.use(async (ctx, next) => {
      if (!this.inCurrentPath) {
        process.chdir(this.currentPath)
        this.inCurrentPath = true
      }
      await next()
    })
    // body parsing
    this.app.use(koaBody())

    // logging
    this.app.use(logger())

    this.setRouters()

    // use router
    this.app.use(this.router.routes()).use(this.router.allowedMethods())

    // error handling
    this.app.on('error', err => {
      console.error('server error', err)
    })
  }

  /**
   * setRouters
   *
   * @memberof Server
   */
  setRouters () {
    // welcome
    this.router.get('/', async (ctx, next) => {
      ctx.body = 'Hola!'
    })

    // get meta data
    this.router.post('/getOnlineFileByappId.json', async (ctx, next) => {
      const file = await readFileAsync(`${tmpDistDir}/app/app.zip`)
      const fileHash = md5(file)
      ctx.body = {
        status: {
          status_code: 0,
          status_reason: 'success'
        },
        result: {
          appId: ctx.request.body.appId,
          appName: 'demo',
          appVersion: 'v2.1.1',
          url: `http://${this.ip}:${defaultPort}/app/app.zip`,
          md5: fileHash,
          updateOnLaunch: true
        }
      }
    })

    // app.zip
    this.router.get('/app/:filename', async (ctx, next) => {
      await send(ctx, `${tmpDistDir}/app/${ctx.params.filename}`)
    })

    // framework.zip
    this.router.get('/framework/:filename', async (ctx, next) => {
      await send(ctx, `${tmpDistDir}/framework/${ctx.params.filename}`)
    })
  }
  /**
   * Start server
   *
   * @memberof Server
   */
  start () {
    this.app.listen(this.port)
  }
}

/**
 * Start js bundle server
 * @param {Object} options
 */
function startJSServer (options) {
  const port = +options.port || defaultPort
  return detectPort(port)
    .then(_port => {
      if (port === _port) {
        new Server(port).start()
        console.log(` => ${chalk.cyan.bold(`Listening on port: ${port}`)}`)
      } else {
        console.log(
          ` => ${chalk.red.bold(
            `Port: ${port} was occupied, try port: ${_port}`
          )}`
        )
      }
    })
    .then(() => ({ options }))
    .catch(err => {
      console.error(err)
    })
}

module.exports = startJSServer
