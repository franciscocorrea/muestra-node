'use strict'

const Withdrawals = require('../../controllers/user').Withdrawals

module.exports = (lindy) => {
  const withdrawals = lindy.router('/api/users/withdrawals')

  withdrawals.post('/', 'Withdrawal an amount from the earned money')
  .middleware('auth')
  .params((validate) => {
    validate.number('amount', ' amount to withdrawal')
  })
    .run((params) => Withdrawals.store(params))
}
