'use strict'

const Bets = require('../../models').bets
const Validator = require('../../services/bet').Validation
const pync = require('pync')
const rejects = require('lindyhop').rejects
const UserCredit = require('../../services/money').UserCredit
const Subscriber = require('../../services/bet').Subscriber
const Dates = require('../../services/bet').Dates
const ErrorHandler = require('../../exceptions/handler')
const services = require('../../services')
const Transaction = require('../../services/money').Transaction

class BetsController {
  /**
   * lists all the bets.
   * @param {*} params
   */
  static async index (params) {
    const bets = await Bets
      .selectAll({userId: params.user.id}, {limit: 1000, orderBy: 'date ASC'})

    return {bets}
  }

  /**
   * stores a new bet for an user
   * @param {*} params
   */
  static async store (params) {
    const user = params.user
    const betsData = params.betsData
    for (const date of betsData.dates) {
      if (!Validator.date(betsData.game, date)) {
        return rejects.badRequest('Existe un problema con la fecha de la apuesta')
      }
    }
    const creditService = new UserCredit(user)
    const transaction = await creditService.deduct(betsData.total)
    if (!transaction.success) {
      return rejects.badRequest(transaction.error)
    }
    try {
      let bets = []
      await pync.series(betsData.bets, async (betData, index) => {
        const jackpots = await services.gadminApi.getJackpots(betData.game, betData.date)
        const jackpot = jackpots.bote[0].importe[0] === 'Sin Bote' ? null : jackpots.bote[0].importe[0]
        const boughtOrder = {id: [437734]}
        betData.date = Dates.gameDate(betData.game, betData.date)
        if (betData.subscribe) {
          Subscriber.addFromUser(user, betData)
        }
        const bet = await Bets.insert({
          userId: user.id,
          externalId: boughtOrder.id[0],
          game: betData.game,
          date: betData.date,
          num: betData.quantity,
          bet: betData.bet,
          price: betData.price,
          bote: jackpot,
          subscription: betData.subscribe || false,
          createdAt: new Date()
        })
        const transactionDescription = `Compra  ${betData.game.charAt(0).toUpperCase() + betData.game.slice(1)}`
        Transaction
          .fromUser(-betData.total, 'bet', transactionDescription, user, bet.id)
        bets.push(bet)
      })
      return {bets}
    } catch (error) {
      creditService.add(betsData.total)
      ErrorHandler.report(error, 'User bets controller: store')
      return rejects
        .badRequest('Ha ocurrido un problema durante la compra, por favor intenta de nuevo más tarde')
    }
  }
}

module.exports = BetsController
