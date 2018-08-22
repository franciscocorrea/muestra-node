const services = require('../services')
const betService = services.bet
const subscriptions = services.subscriptions
const errorHandler = require('../exceptions/handler')
const notifications = require('../notifications')
const cron = require('node-cron')
const Subscriber = require('../services/bet').Subscriber

module.exports = (lindy) => {
  /**
   * Starts the jobs
   */
  const startJobs = () => {
    this.playSubscriptions.start()
    this.chargePendingPayments.start()
    this.checkForBetsWithSpecialCharacters.start()
    this.addDataMillonInBets.start()
    this.validateBets.start()

    // this.notificationBotesPrimitiva.start()
    // this.notificationBotesBonoloto.start()
    // this.notificationBotesGordo.start()
    // this.notificationBotesEuromillones.start()
    // this.notificationBotesLoteria.start()
  }

  /**
   * Play subscriptions
   */
  exports.playSubscriptions = cron.schedule('0 */12 * * *', async () => {
    try {
      await Subscriber.buyUsersBets()
    } catch (error) {
      errorHandler.report(error, 'Play subscription')
    }
  }, false)

  /**
   * Execute pending payments
   */
  exports.chargePendingPayments = cron.schedule('0,30 * * * *', async () => {
    try {
      subscriptions.chargePendingPayments()
    } catch (error) {
      errorHandler.report(error, 'Charge pending payments')
    }
  }, false)

  /**
   * Check for bets with specials characters
   */
  exports.checkForBetsWithSpecialCharacters = cron.schedule('0 1,13 * * *', async () => {
    try {
      betService.checkForBetsWithSpecialCharacters()
    } catch (error) {
      errorHandler.report(error, 'Update bets with special characters')
    }
  }, false)

  /**
   * Add new data euromillon - el millon y lluvia de millones.
   */
  exports.addDataMillonInBets = cron.schedule('0 1,13 * * *', async () => {
    try {
      betService.addNewDataForBetsEuromillones()
    } catch (error) {
      errorHandler.report(error, 'add special values to euromillon bets ')
    }
  }, false)

  /**
   * Validate for bets
   */
  exports.validateBets = cron.schedule('0 */3 * * *', async () => {
    try {
      await betService.validate()
    } catch (error) {
      errorHandler.report(error, 'Bets validation')
    }
  }, false)

  // /**
  //  * Send push notification Botes Primitiva
  //  */
  // exports.notificationBotesPrimitiva = cron.schedule('0 10 * * 4', async () => {
  //   try {
  //     notifications.push_botes_cc.notificationBotes('primitiva')
  //   } catch (error) {
  //     errorHandler.report(error, 'Push Botes Notifications Primitiva')
  //   }
  // })

  // /**
  //  * Send push notification Botes Bonoloto.
  //  *
  //  * @type {ScheduledTask}
  //  */
  // exports.notificationBotesBonoloto = cron.schedule('0 10 * * 1-6', async () => {
  //   try {
  //     notifications.push_botes_cc.notificationBotes('bonoloto')
  //   } catch (error) {
  //     errorHandler.report(error, 'Push Botes Notification Bonoloto')
  //   }
  // })

  // /**
  //  * Send push notification Botes Gordo Primitiva.
  //  *
  //  * @type {ScheduledTask}
  //  */
  // exports.notificationBotesGordo = cron.schedule('0 10 * * 5', async () => {
  //   try {
  //     notifications.push_botes_cc.notificationBotes('gordo_primitiva')
  //   } catch (error) {
  //     errorHandler.report(error, 'Push Botes Notification Gordo')
  //   }
  // })

  // /**
  //  * Send push notification Botes Euromillones.
  //  *
  //  * @type {ScheduledTask}
  //  */
  // exports.notificationBotesEuromillones = cron.schedule('0 10 * * 2,5', async () => {
  //   try {
  //     notifications.push_botes_cc.notificationBotes('euromillones')
  //   } catch (error) {
  //     errorHandler.report(error, 'Push Botes Notification Euromillones')
  //   }
  // })

  // /**
  //  * Send push notification Botes Loteria
  //  *
  //  * @type {ScheduledTask}
  //  */
  // exports.notificationBotesLoteria = cron.schedule('0 10 * * 3,6', async () => {
  //   try {
  //     notifications.push_botes_cc.notificationBotes('loteria')
  //   } catch (error) {
  //     errorHandler.report(error, 'Push Botes Notification Loteria')
  //   }
  // })

  startJobs()
}
