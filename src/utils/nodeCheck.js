var semCmp = require('semver-compare')
var chalk = require('chalk')

if (semCmp(process.version.slice(1), '7.6.0') < 0) {
  console.log(chalk.red('!!!!!!! Node版本最低要求为：7.6.0 !!!!!!!'))
  process.exit(0)
}
