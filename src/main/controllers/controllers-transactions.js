var models = require('../models')

module.exports = class TransactionsController {
  static list (params) {
    return models.transactions.selectAll({
      userId: params.user.id
    }, { limit: 1000, orderBy: 'id DESC' })
    .then((transactions) => ({ transactions }))
  }

  static group (params) {
    return models.transactions.selectAll({
      groupId: params.group.id,
      'userId is': null
    }, { limit: 1000, orderBy: 'id DESC' })
    .then((transactions) => ({ transactions }))
  }
}
