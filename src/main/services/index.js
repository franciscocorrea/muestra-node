var fs = require('fs')
var files = fs.readdirSync(__dirname)
var prefix = 'service-'
files.forEach((file) => {
  if (file.indexOf(prefix) === 0) {
    var name = file.substring(prefix.length)
    name = name.substring(0, name.length - 3)
    exports[name] = require('./' + file)
  }
})
