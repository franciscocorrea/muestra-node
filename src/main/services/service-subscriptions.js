const models = require('../models')
const db = models.seaquel
const controllers = require('../controllers')
const services = require('../services')
const pync = require('pync')
const moment = require('moment')
const errorHandler = require('../exceptions/handler')

const payPending = async (user, group, retry, limitDate) => {
  return Promise.all([
    models.users.selectOne({ id: user.id }),
    models.memberships.selectOne({ userId: user.id, groupId: group.id }),
    models.subscriptions.selectOne({groupId: group.id})
  ])
  .then((res) => {
    var [user, membership, subscription] = res
    if (membership.paymentLimit && membership.paymentLimit < new Date()) {
      return models.groups.selectOne({ id: group.id })
        .then((group) => {
          return services.groups.leave(user, group)
        })
    }
    var amount
    return Promise.resolve()
      .then(() => {
        amount = group.shareInitial // * (membership.pendingPayments + 1)
        if (user.credit - amount < 0) {
          var date = moment(subscription.date).add(1, 'week')
          return services.tpv.chargeUser(user, amount, date.add(-2, 'day').toDate(), group.name, true, membership)
        }
      })
      .then(() => {
        var description = `Aportación Peña ${group.name}`
        return services.credit.creditUser(user, 'bet', amount, group, description)
      })
      .then(() => {
        membership.paymentRetries = 0
        membership.pendingPayments = 0
        return models.memberships.update({
          paymentRetries: 0,
          pendingPayments: 0,
          userId: user.id,
          groupId: group.id
        })
        .then(() => {
          return models.bets.selectAll({
            groupId: group.id,
            'userId is': null,
            'createdAt >': group.latestCampaign,
            'date >': new Date()
          })
        })
        .then((bets) => {
          return pync.series(bets, (bet) => {
            if (bet.userId !== null) return // should never happen
            console.log('inserting bet')
            return models.bets.insert({
              groupId: bet.groupId,
              userId: user.id,
              transactionId: bet.transactionId,
              bet: bet.bet,
              game: bet.game,
              num: bet.num,
              date: bet.date,
              createdAt: new Date(),
              externalId: bet.externalId,
              price: bet.price,
              bote: bet.bote,
              subscriptionId: bet.subscriptionId,
              subscription: bet.subscription,
              gadminUser: bet.gadminUser
            })
          })
        })
        .then(() => services.groups.updateFields(group)) // updates memberships
      })
      .catch((err) => {
        console.log('Error charging user', err)
        if (retry) {
          membership.paymentRetries++
        } else {
          membership.paymentRetries = 1
          membership.pendingPayments++
          membership.paymentLimit = limitDate
        }
        return models.memberships.update(membership)
      })
  })
}

exports.chargePendingPayments = async () => {
  console.log('[service subscriptions] starting charge pending payments')
  const memberships = await models.memberships.selectAll({ 'pendingPayments >': 0 })
  await pync.series(memberships, async (membership) => {
    let user = { id: membership.userId }
    let group = await models.groups.selectOne({ id: membership.groupId })
    await payPending(user, group, true)
  })
  console.log('[service subscriptions] charge pending payments executed with success')
}

exports.play = async () => {
  console.log('[service subscriptions] starting play subscriptions')
  let subscriptions = await db.queryAll('SELECT * FROM "public"."subscriptions" WHERE "date" BETWEEN CURRENT_DATE - INTERVAL \'15d\' AND CURRENT_DATE ORDER BY "date" DESC LIMIT 1000 OFFSET 0')
  await pync.series(subscriptions, async (subscription) => {
    let date = moment(subscription.date).add(1, 'week')
    let subscriptionData = await Promise.all([
      subscription.groupId ? models.groups.selectOne({ id: subscription.groupId }) : null,
      subscription.userId ? models.users.selectOne({ id: subscription.userId }) : null,
      models.bets.selectOne({ id: subscription.betId })
    ])
    let [group, user, bet] = subscriptionData
    let amount = bet.price * bet.num
    if (user) {
      if (user.credit - amount < 0) {
        try {
          await services.tpv.chargeUser(user, amount, moment(date).add(-2, 'day').toDate(), bet.game, false, subscription)
        } catch (error) {
          errorHandler.report(error, '[PlaySubscription: tpv]')
          return
        }
      }
    } else if (group) {
      if (group.credit - amount < 0) {
        var limitDate = moment(date).add(-2, 'day').toDate()
        await db.transaction(async () => {
          await services.groups.startCampaign(group, group.shareInitial, null, limitDate)
        })
        let memberships = await models.memberships.selectAll({ groupId: group.id })
        await pync.series(memberships, async (membership) => {
          let user = await models.users.selectOne({ id: membership.userId })
          console.log('updating member', user.firstName, user.lastName, user.credit, group.shareInitial)
          await payPending(user, group, false, limitDate)
        })
      }
    }
    await controllers.bets.play({
      user: user,
      group: group,
      dates: [date.format('DD/MM/YYYY HH:mm')],
      price: bet.price,
      bet: bet.bet,
      num: bet.num,
      game: bet.game,
      subscribe: 'false',
      subscriptionId: subscription.id
    })
    subscription.date = date.toDate()
    await models.subscriptions.update(subscription)
  })
  console.log('[service subscriptions] play subscriptions executed with success')
}
