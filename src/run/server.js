const { buildJS } = require('../utils')
const startJSServer = require('../utils/server')

/**
 * Run on web
 * @param {Object} options
 */
function runServer (options) {
  buildJS(options)
    .then(startJSServer)
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

module.exports = runServer
