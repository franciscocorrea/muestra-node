const lindyhop = require('lindyhop')
const controllers = require('../controllers')

module.exports = (lindy) => {
  const autoupdate = lindy.router('/api/autoupdate')

  autoupdate.get('/android', 'Checks if there are updates available')
    .params((validate) => {
      validate.string('version', 'The current version')
    })
    .run((params) => controllers.autoupdate.android(params))

  autoupdate.get('/android/latest', 'Redirects to latest APK')
    .run((params) => lindyhop.redirect(`/downloads/${process.env.LATEST_APK}`))
}
