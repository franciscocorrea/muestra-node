const lindyhop = require('lindyhop')
const moment = require('moment')
moment.locale('es')
const TpvTransactions = require('../../controllers/admin').TpvTransactions

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
  params.moment = moment
  params.DATE_FORMAT = 'DD/MM/YYYY'
  params.DATE_DD_MM_YY = 'DD/MM/YY'
  params.DATE_TIME_FORMAT = 'DD/MM/YY HH:mm:ss'
  params.currency = (amount) => ((amount || 0) / 100).toFixed(2) + ' €'
})

module.exports = (lindy) => {
  const tpvTransactions = lindy.router('/admin/tpv-transactions')

  tpvTransactions.get('/', 'List tpv transactions')
    .middleware('admin-auth')
    .middleware('admin')
    .middleware('pagination')
    .outputs('html', 'admin/admin-tpv.pug')
    .run((params) => TpvTransactions.index(params))

  tpvTransactions.get('/user/:id', 'List tpv transactions by user')
  .middleware('admin-auth')
  .middleware('admin')
  .middleware('pagination')
  .params((validate) => {
    validate.string('id', 'The user/group id').in('path')
  })
  .outputs('html', 'admin/admin-tpv.pug')
  .run((params) => TpvTransactions.index(params))
}
