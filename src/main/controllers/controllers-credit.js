var models = require('../models')
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects
var incr = require('seaquel').incr

module.exports = class UsersController {
  static webhook (params) {
    const { merchantIdentifier, expirationDate, cardNumber } = params
    return Promise.resolve()
      .then(() => {
        var prefix = 'userId:'
        if (params.session.indexOf(prefix) !== 0) return rejects.badRequest('Invalid session information')
        return models.users.selectOne({ id: params.session.substring(prefix.length) })
      })
      .then((user) => {
        return models.transactions.insert({
          description: 'Ingresado',
          userId: user.id,
          amount: params.amount,
          createdAt: new Date(),
          previousCredit: user.credit,
          type: 'credit'
        })
        .then(() => {
          user.credit += params.amount
          user.redsysMerchantIdentifier = merchantIdentifier
          user.redsysExpiryDate = expirationDate
          user.cardNumber = cardNumber
          return models.users.update({
            id: user.id,
            redsysMerchantIdentifier: user.redsysMerchantIdentifier,
            redsysExpiryDate: user.redsysExpiryDate,
            credit: incr(params.amount)
          })
        })
      })
      .then(() => ({}))
  }

  static transactions (params) {
    return models.transactions.selectAll({ userId: params.user.id }, { limit: 1000, orderBy: '"createdAt" DESC' })
      .then((transactions) => ({ transactions }))
  }
}
