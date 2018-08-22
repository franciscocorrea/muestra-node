var models = require('../models')
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects

module.exports = class SubscriptionsController {
  static delete (params) {
    return Promise.resolve()
      .then(() => {
        if (params.subscription.groupId) {
          return models.memberships.selectOne({
            groupId: params.subscription.groupId,
            userId: params.user.id
          })
          .then((membership) => {
            if (membership.level !== 'admin') {
              return rejects.forbidden('Esta suscripción pertenece a un grupo y no eres el administrador')
            }
          })
        }
      })
      .then(() => {
        return models.bets.updateWhere({ subscriptionId: null }, { subscriptionId: params.subscription.id })
      })
      .then(() => {
        return models.subscriptions.delete(params.subscription)
      })
      .then(() => ({}))
  }
}
