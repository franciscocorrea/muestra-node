'use strict'

const services = require('../services')
const models = require('../models')
const moment = require('moment')

/**
 * Send push notification.
 *
 * @param devices
 * @param bet
 * @param message
 */
const sendPushNotificationResult = async(devices, bet, message) => {
  devices.forEach((device) => {
    services.push.sendSimpleNotification(device, {
      alert: message,
      payload: {
        importe: bet.prize ? bet.prize : 0
      }
    })
  })
}

/**
 * Get notification configuration and verify if bet have prize.
 *
 * @param bet
 */
exports.notify = async (bet) => {
  console.log('[Se ejecuta la notificación push]')
  const notificationPrize = await models.notificationPrize.selectOne({userId: bet.userId})
  if (notificationPrize) {
    if (notificationPrize.subscribe) {
      let devices = await models.devices.selectAll({userId: notificationPrize.userId})
      if (bet.prize) {
        sendPushNotificationResult(devices, bet, `¡Enhorabuena! Tu apuesta de ${bet.game} del sorteo del ${moment(bet.date, 'dddd')} ${moment(bet.date, 'DD')} ha sido premiada con ${(bet.prize) / 100}€ y ya lo hemos ingresado en tu cuenta de LotterApp.`)
      } else {
        sendPushNotificationResult(devices, bet, `Tu apuesta de ${bet.game} del sorteo del ${moment(bet.date, 'dddd')} ${moment(bet.date, 'DD')} no ha obtenido premio. Desde LotterApp te deseamos mucha suerte para los próximos sorteos.`)
      }
    }
  }
}
