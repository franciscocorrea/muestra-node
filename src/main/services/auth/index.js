'use strict'

const fs = require('fs')
const files = fs.readdirSync(__dirname)
const suffix = 'Service.js'
files.forEach((file) => {
  if (file.indexOf(suffix)) {
    let name = file.substring(0, file.indexOf(suffix))
    exports[name] = require('./' + file)
  }
})
