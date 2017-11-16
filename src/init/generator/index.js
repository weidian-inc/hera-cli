const Generator = require('yeoman-generator')
const fs = require('fs')

module.exports = class extends Generator {
  writing () {
    const copy = (file, dist) => {
      this.fs.copy(this.templatePath(file), this.destinationPath(file))
    }

    copy('./')

    fs.writeFileSync(
      this.destinationPath('../config.json'),
      JSON.stringify({ dir: this.options.projectName }, 4)
    )
    fs.writeFileSync(this.destinationPath('../.gitignore'), 'heraTmp')
  }
}
