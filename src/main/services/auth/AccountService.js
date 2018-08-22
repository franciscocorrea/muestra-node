'use strict'

const lindyhop = require('lindyhop')
const AuthServices = require('../auth')
const Device = require('../../models').devices
const RecordDevice = require('../../models').recordDevices
const User = require('../../models').users
const Session = require('../../models').sessions
const rejects = lindyhop.rejects

/**
 * handled the user duplicate key on session
 *
 * @param {*} email
 */
exports.duplicate = async (email) => {
  const user = await User.selectOne({ email })
  let message = 'Tienes que iniciar sesión desde la misma cuenta con la que te has registrado. '
  message += 'Prueba iniciar sesión con '
  if (user.google) {
    message += 'Google'
  } else if (user.facebook) {
    message += 'Facebook'
  } else {
    message += 'tu mail y contraseña'
  }

  return rejects.badRequest(message)
}

/**
 * regenerate the session for the user.
 */
exports.regenerateSession = async (user, params, isNew) => {
  const token = await AuthServices.Tokenizer.randomCryptoToken()
  const session = await Session.insert({
    lastSeen: new Date(),
    userId: user.id,
    createdAt: new Date(),
    token
  })

  if (params.deviceId && params.deviceType) {
    const device = await Device.selectOne({
      id: params.deviceId,
      type: params.deviceType
    })
    if (device && device.userId !== user.id) {
      await Device.delete(device)
    }
    if (!device || device.userId !== user.id) {
      await Device.insert({
        userId: user.id,
        id: params.deviceId,
        type: params.deviceType,
        createdAt: new Date(),
        session: session.token
      })
    } else {
      Device.update({id: device.id, session: session.token})
    }
  }
  if (params.versionNumber && params.familyDevice && params.versionLite) {
    await RecordDevice.insert({
      versionNumber: params.versionNumber,
      familyDevice: params.familyDevice,
      versionLite: params.versionLite,
      createdAt: new Date(),
      userId: user.id
    })
  }
  user.credit = user.loadedCredit + user.earnedCredit

  return {session: session.token, user, isNew}
}
