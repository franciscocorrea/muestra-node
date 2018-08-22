var fs = require('fs')
var files = fs.readdirSync(__dirname)
var prefix = 'validator-'
files.forEach((file) => {
  if (file.indexOf(prefix) === 0) {
    require('./' + file)
  }
})
