if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
} else {
  require('dotenv').config()
}
require('source-map-support').install()
const app = require('./app')
const lindy = require('./lindy')

require('./models')
require('./validators')
require('./middlewares')(lindy)
require('./routes')(lindy)
require('./routes/admin')(lindy)
require('./routes/user')(lindy)

exports.lindy = lindy

app.set('port', process.env.PORT || 3000)
const server = app.listen(app.get('port'), () => {
  console.log(`Server running → PORT ${server.address().port}`)
})
