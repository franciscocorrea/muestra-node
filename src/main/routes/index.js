const fs = require('fs')

module.exports = (lindy) => {
  var files = fs.readdirSync(__dirname)
  var prefix = 'routes-'
  files.forEach((file) => {
    if (file.indexOf(prefix) === 0) {
      require('./' + file)(lindy)
    }
  })
}
