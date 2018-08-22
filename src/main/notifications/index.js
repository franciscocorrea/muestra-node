const fs = require('fs')
const files = fs.readdirSync(__dirname)
const prefix = 'notify-'
files.forEach((file) => {
  if (file.indexOf(prefix) === 0) {
    let name = file.substring(prefix.length)
    name = name.substring(0, name.length - 3)
    exports[name] = require('./' + file)
  }
})
