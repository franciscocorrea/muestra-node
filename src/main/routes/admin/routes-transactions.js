const lindyhop = require('lindyhop')
const moment = require('moment')
moment.locale('es')
const Transactions = require('../../controllers/admin').Transactions

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
  params.moment = moment
  params.DATE_FORMAT = 'DD/MM/YYYY'
  params.DATE_DD_MM_YY = 'DD/MM/YY'
  params.DATE_TIME_FORMAT = 'DD/MM/YY HH:mm:ss'
  params.currency = (amount) => ((amount || 0) / 100).toFixed(2) + ' €'
})

module.exports = (lindy) => {
  const transactions = lindy.router('/admin/transactions')

  transactions.get('/', 'List the transactions')
    .middleware('admin-auth')
    .middleware('admin')
    .middleware('pagination')
    .outputs('html', 'admin/admin-transactions.pug')
    .run((params) => Transactions.index(params))

  transactions.get('/:type/:id', 'List the transactions of by user')
    .middleware('admin-auth')
    .middleware('admin')
    .middleware('pagination')
    .params((validate) => {
      validate.string('type', 'The filter by user/group').in('path')
      validate.string('id', 'The user/group id').in('path')
    })
    .outputs('html', 'admin/admin-transactions.pug')
    .run((params) => Transactions.index(params))
}
