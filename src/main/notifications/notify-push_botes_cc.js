'use strict'

const services = require('../services')
const models = require('../models')
const pync = require('pync')

/**
 * Get all configuration notification and get all id devices.
 *
 * @param bote
 */
const sendPushSpecificBote = async (bote) => {
  console.log('Execute send push botes')
  let notificationBotes = await models.notificationBotes.selectAll({game: 'all', subscribe: true})

  if (notificationBotes.length !== 0) {
    await pync.series(notificationBotes, async (notification) => {
      let devices = await models.devices.selectAll({userId: notification.userId})
      sendNotificationPush(devices, bote)
    })
  }
}

/**
 * Send push notification botes.
 *
 * @param devices
 * @param bote
 */
const sendNotificationPush = async(devices, bote) => {
  console.log('[Execute] notification botes')
  devices.forEach((device) => {
    services.push.sendSimpleNotification(device, {
      alert: `El Bote de ${bote.importe[0]}€ en ${bote.$.juego} este ${bote.fecha[0]} Juega ahora desde LotterApp y cuando te toque... imagínalo!`,
      payload: {
        importe: bote.importe[0],
        date: bote.fecha[0]
      }
    })
  })
}

/**
 * Foreach all botes and send push notification to users.
 *
 * @returns {*|Promise.<TResult>}
 */
exports.notificationBotes = async (game) => {
  console.log('[The notifications cron is executed on boats]')
  let botes = await services.gadminApi.getJackpots(game)
  return pync.series(botes.bote, async (bote) => {
    if (bote.fecha[0] !== '-' && bote.importe[0] !== 'Sin Bote') {
      await sendPushSpecificBote(bote)
    }
  }).then(() => {
    console.log('Las notificaciones a los botes han sido enviadas')
  })
}
