const lindyhop = require('lindyhop')
const moment = require('moment')
moment.locale('es')
const Withdrawals = require('../../controllers/admin').Withdrawals

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
  params.moment = moment
  params.DATE_FORMAT = 'DD/MM/YYYY'
  params.DATE_DD_MM_YY = 'DD/MM/YY'
  params.DATE_TIME_FORMAT = 'DD/MM/YY HH:mm:ss'
  params.currency = (amount) => ((amount || 0) / 100).toFixed(2) + ' €'
})

module.exports = (lindy) => {
  const withdrawals = lindy.router('/admin/withdrawals')

  withdrawals.get('/', 'List the withdrawals')
  .middleware('admin-auth')
  .middleware('admin')
  .middleware('pagination')
  .outputs('html', 'admin/admin-withdrawals.pug')
  .run((params) => Withdrawals.index(params))

  withdrawals.get('/user/:id', 'List the withdrawals by user id')
  .middleware('admin-auth')
  .middleware('admin')
  .middleware('pagination')
  .params((validate) => {
    validate.string('id', 'The user/group id').in('path')
  })
  .outputs('html', 'admin/admin-withdrawals.pug')
  .run((params) => Withdrawals.index(params))

  withdrawals.post('/process/:id', 'Update date process withdrawals')
  .middleware('admin-auth')
  .middleware('admin')
  .middleware('pagination')
  .params((validate) => {
    validate.string('id', 'The user/group id').in('path')
  })
  .run((params) => Withdrawals.update(params))
}
