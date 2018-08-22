const fs = require('fs')
const path = require('path')
const lindy = require('./start').lindy
fs.writeFileSync(path.join(__dirname, '../../api.json'), JSON.stringify(lindy.docs()))
process.exit(0)
