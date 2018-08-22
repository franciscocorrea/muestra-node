const pync = require('pync')
var models = require('../models')

module.exports = class PushNotificationController {
    /**
     * Set Subscribe notification push botes.
     *
     * @param params
     * @returns {*|Promise.<TResult>}
     */
  static async subscribeBotes (params) {
    const user = params.user
    var bonoloto = params.bonoloto
    var euromillones = params.euromillones
    var primitiva = params.primitiva
    var gordo = params.gordo
    var quinela = params.quinela
    var loteria = params.loteria
    var all = params.all

    var notifications = await models.notificationBotes.selectAll({userId: user.id})

    return pync.series((notifications), async(notification) => {
      if (bonoloto) {
        if (notification.game === 'bonoloto') {
          notification.subscribe = bonoloto !== '0'
        }
      }

      if (euromillones) {
        if (notification.game === 'euromillones') {
          notification.subscribe = euromillones !== '0'
        }
      }

      if (primitiva) {
        if (notification.game === 'primitiva') {
          notification.subscribe = primitiva !== '0'
        }
      }

      if (gordo) {
        if (notification.game === 'gordo') {
          notification.subscribe = gordo !== '0'
        }
      }

      if (quinela) {
        if (notification.game === 'quinela') {
          notification.subscribe = quinela !== '0'
        }
      }

      if (loteria) {
        if (notification.game === 'loteria') {
          notification.subscribe = quinela !== '0'
        }
      }

      if (all) {
        if (notification.game === 'all') {
          notification.subscribe = all !== '0'
        }
      }

      await models.notificationBotes.update(notification)
    }).then(() => { return notifications })
  }

    /**
     * Set subscribe push notification prizes.
     *
     * @param params
     * @returns {*|Promise.<TResult>}
     */
  static async subscribePrize (params) {
    const user = params.user
    var subscribe = params.subscribe
    var time = params.time

    var notifications = await models.notificationPrize.selectAll({userId: user.id})

    return pync.series((notifications), async(notificacion) => {
      if (time) {
        notificacion.time = time
      }

      notificacion.subscribe = subscribe !== '0'

      await models.notificationPrize.update(notificacion)
    }).then(() => { return notifications })
  }

    /**
     * Set subscribe push notification news.
     *
     * @param params
     * @returns {*|Promise.<TResult>}
     */
  static async subscribeNews (params) {
    const user = params.user
    var subscribe = params.subscribe
    var time = params.time

    var notifications = await models.notificationNews.selectAll({userId: user.id})

    return pync.series((notifications), async(notification) => {
      if (time) {
        notification.time = time
      }

      notification.subscribe = subscribe !== '0'

      await models.notificationPrize.update(notification)
    }).then(() => { return notifications })
  }

    /**
     * Add configuration push notifications for users.
     *
     * @returns {Promise.<TResult>|*}
     */
  static addConfigurations () {
    return models.users.selectAll()
            .then((results) => {
              return pync.series((results), async(user) => {
                await models.notificationPrize.insert({userId: user.id, subscribe: true})
                await models.notificationNews.insert({userId: user.id, subscribe: true})
                await models.notificationBotes.insert({game: 'all', userId: user.id, subscribe: true})
              })
                .then(() => {
                  return 'La ejecución se ejecutó satisfactoriamentes'
                })
            })
  }
}
