var controllers = require('../controllers')
var models = require('../models')

module.exports = (lindy) => {
  var transactions = lindy.router('/api/transactions')

  transactions.get('/list', 'List the transactions of the authenticated user')
    .middleware('auth')
    .run((params) => controllers.transactions.list(params))

  transactions.get('/group', 'List the transactions of a group')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.transactions.group(params))
}
