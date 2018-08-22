var controllers = require('../controllers')
const UserControllers = require('../controllers/user')
const Tpv = require('../services/money').Tpv
var models = require('../models')
var pync = require('pync')

module.exports = (lindy) => {
  var credit = lindy.router('/api/credit')

  credit.get('/load', '[Deprecate] Presents the page to load more credit into the user\'s account')
    .middleware('auth')
    .outputs('html', 'credit-load')
    .params((validate) => {
      validate.number('amount', 'Optional amount defined by the app').optional()
    })
    .run((params) => {
      var amounts = +params.amount ? [{ value: params.amount }] : [
        { value: 500 },
        { value: 1000 },
        { value: 2000 },
        { value: 5000 }
      ]
      var user = params.user
      models.subscriptions.selectAll({userId: user.id, 'date >': new Date(), 'failed_pay': true})
          .then((subscriptions) => {
            pync.series(subscriptions, (subscription) => {
              subscription.failed_pay = false
              models.subscriptions.update(subscription)
            })
          })

      models.memberships.selectAll({userId: user.id, 'paymentLimit >': new Date(), 'failed_pay': true})
            .then((memberships) => {
              pync.series(memberships, (membership) => {
                membership.failed_pay = false
                models.memberships.update(membership)
              })
            })

      amounts.forEach((dict) => {
        var amount = dict.value
        const tpvService = new Tpv(user)
        Object.assign(dict, tpvService.buildOrder(amount))
        dict.text = `${amount / 100} €`
      })
      return {
        amounts,
        TPV_URL: process.env.TPV_URL
      }
    })

  credit.get('/success', '[Deprecate] Presents the success page after a user loaded credit into his account')
    .outputs('html', 'credit-success')
    .run((params) => {
      return {}
    })

  credit.get('/failure', '[Deprecate] Presents the failure page after if the payment process fails')
    .outputs('html', 'credit-failure')
    .run((params) => {
      return {}
    })

  credit.post('/webhook', '[Deprecate] Online notification received when a payment is successful')
    .params((validate) => {
      validate.string('Ds_SignatureVersion', 'Signature algorithm used')
      validate.string('Ds_MerchantParameters', 'The merchant parameters').as('parameters')
      validate.string('Ds_Signature', 'The signature').as('signature')
    })
    .run((params) => UserControllers.Escrows.store(params))
  credit.get('/transactions', '[Deprecate] Get the list of transactions of a user')
    .middleware('auth')
    .run((params) => controllers.credit.transactions(params))
}
