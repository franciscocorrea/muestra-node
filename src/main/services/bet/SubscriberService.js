'use strict'

const DB = require('../../models').seaquel
const Subscriptions = require('../../models').subscriptions
const Users = require('../../models').users
const pync = require('pync')
const Bets = require('../../models').bets
const UserCredit = require('../../services/money').UserCredit
const Validator = require('./ValidationService')
const ErrorHandler = require('../../exceptions/handler')
const services = require('../../services')
const Transaction = require('../../services/money').Transaction
const moment = require('moment')

class SubscriberService {
  /**
   * store a new subscription from a user bet
   * @param {*} user
   * @param {*} betData
   */
  static async addFromUser (user, betData) {
    return Subscriptions.insert({
      userId: user.id,
      groupId: null,
      date: betData.date,
      game: betData.game,
      num: betData.quantity,
      bet: betData.bet,
      price: betData.price,
      createdAt: new Date()
    })
  }

  /**
   * store a new subscription from a group bet
   * @param {*} user
   * @param {*} betData
   */
  static async addFromGroup (group, betData) {
    return Subscriptions.insert({
      userId: null,
      groupId: group.id,
      date: betData.date,
      game: betData.game,
      num: betData.quantity,
      bet: betData.bet,
      price: betData.price,
      createdAt: new Date()
    })
  }

  /**
   * Buys the users bets on subscription mode
   */
  static async buyUsersBets () {
    const subscriptions = await DB
      .queryAll('SELECT * FROM "public"."subscriptions" WHERE "groupId" IS NULL AND "active" = \'true\' AND "date" < CURRENT_DATE ORDER BY "date" DESC LIMIT 1000 OFFSET 0')
    await pync.series(subscriptions, async (subscription) => {
      if (!Validator.date(subscription.game, subscription.date)) {
        ErrorHandler.report(
          {message: `The date for subscription: ${subscription.id} is incorrect`, status: 801},
          '[User bets subscriber]: buy users bets'
        )
        return
      }
      const purchaseTotal = subscription.price * subscription.num
      const user = await Users.selectOne({id: subscription.userId})
      const creditService = new UserCredit(user)
      const transaction = await creditService.deduct(purchaseTotal)
      if (!transaction.success) {
        if (transaction.error.indexOf('pago por referencia') > 0) {
          this.deactivateSubscription(subscription)
        }
        ErrorHandler.report(
          {message: `Can not charge amount:${purchaseTotal} from user:${user.id}`, status: 901},
          '[User bets subscriber]: buy users bets'
        )
        return
      }
      try {
        const jackpots = await services.gadminApi.getJackpots(subscription.game, subscription.date)
        const jackpot = jackpots.bote[0].importe[0] === 'Sin Bote' ? null : jackpots.bote[0].importe[0]
        const boughtOrder = {id: [437734]}
        subscription.date = moment(subscription.date).add(1, 'week')
        subscription.updatedAt = new Date()
        const bet = await Bets.insert({
          userId: user.id,
          externalId: boughtOrder.id[0],
          game: subscription.game,
          date: subscription.date,
          num: subscription.num,
          bet: subscription.bet,
          price: subscription.price,
          bote: jackpot,
          subscription: false,
          createdAt: new Date()
        })
        const transactionDescription = `Compra  ${subscription.game.charAt(0).toUpperCase() + subscription.game.slice(1)}`
        Transaction
          .fromUser(-purchaseTotal, 'subscription', transactionDescription, user, bet.id)
        Subscriptions.update(subscription)
        return
      } catch (error) {
        if (transaction.success) { creditService.add(purchaseTotal) }
        ErrorHandler.report(error, '[User bets subscriber]: buy users bets')
      }
    })
  }

  static async deactivateSubscription (subscription) {
    subscription.active = false
    Subscriptions.update(subscription)
  }
}

module.exports = SubscriberService
