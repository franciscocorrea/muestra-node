const lindyhop = require('lindyhop')
const moment = require('moment')
moment.locale('es')
const Users = require('../../controllers/admin').Users

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
  params.moment = moment
  params.DATE_FORMAT = 'DD/MM/YYYY'
  params.DATE_DD_MM_YY = 'DD/MM/YY'
  params.DATE_TIME_FORMAT = 'DD/MM/YY HH:mm:ss'
  params.currency = (amount) => ((amount || 0) / 100).toFixed(2) + ' €'
})

module.exports = (lindy) => {
  const users = lindy.router('/admin/users')

  users.get('/', '')
    .middleware('admin-auth')
    .middleware('admin')
    .middleware('pagination')
    .outputs('html', 'admin/admin-users.pug')
    .run((params) => Users.index(params))
}
