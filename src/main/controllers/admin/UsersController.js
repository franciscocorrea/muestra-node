const models = require('../../models')

module.exports = class TransactionsController {
  static index (params) {
    return models.users.selectAll(null, {
      orderBy: 'id DESC'
    })
      .then((users) => {
        params.users = users
      })
      .then(() => params)
  }
}
