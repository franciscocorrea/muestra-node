const models = require('../models')

exports.store = async (amount, type, description, user = null, group = null, bet = null) => {
  await models.transactions.insert({
    amount,
    type,
    description,
    createdAt: new Date(),
    userId: user ? user.id : null,
    groupId: group ? group.id : null,
    previousCredit: user ? user.credit : group.credit,
    betId: bet ? bet.id : null
  })
}
