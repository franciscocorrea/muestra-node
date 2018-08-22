const models = require('../models')
const incr = require('seaquel').incr
const services = require('./')
const rejects = require('lindyhop').rejects

exports.creditUser = (user, type, amount, group, description, descriptionGroup) => {
  return Promise.resolve().then(() => {
    return models.users.selectOne({ id: user.id })
      .then((usr) => {
        if (usr.credit - amount < 0) {
          return rejects.badRequest(`No tienes suficiente crédito. Necesitas ${amount / 100}€ y tienes ${usr.credit / 100}€`)
        }
        user.credit = usr.credit
      })
  })
  .then(() => {
    return models.transactions.insert({
      description,
      userId: user.id,
      groupId: group && group.id,
      amount: -amount,
      type,
      createdAt: new Date(),
      previousCredit: user.credit
    })
  })
  .then((transaction) => {
    user.credit -= amount
    return models.users.update({ id: user.id, credit: incr(-amount) })
      .then(async () => {
        if (group) {
          const info = await models.users.selectOne({ id: user.id })
          return models.transactions.insert({
            description: descriptionGroup || `Aportación de ${info.firstName || ''} ${info.lastName || ''}`.trim(),
            groupId: group.id,
            amount,
            type,
            createdAt: new Date(),
            previousCredit: group.credit
          })
          .then(() => {
            group.credit += amount
            return models.groups.update({ id: group.id, credit: incr(amount) })
          })
          .then(() => {
            return models.memberships.update({
              latestPayment: new Date(),
              groupId: group.id,
              userId: user.id,
              pendingPayments: 0
            })
          })
          .then(() => services.groups.updateFields(group))
        }
      })
      .then(() => transaction)
  })
}

exports.creditGroup = (group, type, amount, description, bet) => {
  return Promise.resolve().then(() => {
    return models.groups.selectOne({ id: group.id })
      .then((grp) => {
        if (grp.credit - amount < 0) {
          return
        }
        group.credit = grp.credit
      })
  })
  .then(() => {
    return models.transactions.insert({
      description,
      groupId: group.id,
      amount: -amount,
      type,
      betId: bet && bet.id,
      createdAt: new Date(),
      previousCredit: group.credit
    })
  })
  .then((transaction) => {
    group.credit -= amount
    return models.groups.update({ id: group.id, credit: incr(-amount) })
      .then(() => services.groups.updateFields(group))
      .then(() => transaction)
  })
}
