var fs = require('fs')

module.exports = (lindy) => {
  var files = fs.readdirSync(__dirname)
  var prefix = 'middleware-'
  files.forEach((file) => {
    if (file.indexOf(prefix) === 0) {
      require('./' + file)
    }
  })
}
