'use strict'

const AuthServices = require('../../services/auth')
const models = require('../../models')
const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects

class LoginController {
  /**
   * Handled the user login.
   *
   * @param {*} params
   */
  static async signin (params) {
    const user = await models.users.selectOne({ email: params.email })
    if (!user) {
      return rejects.forbidden('Email o contraseña incorrectos')
    }
    if (user.deleted) {
      return rejects.forbidden('Cuenta deshabilitada')
    }
    try {
      await AuthServices.Hasher
        .checkPassword(params.email, params.password, user.password)
    } catch (error) {
      return rejects.forbidden('Email o contraseña incorrectos')
    }
    return this.authenticated(user, params)
  }

  /**
   * Called after the user is authenticated
   *
   * @param {*} user
   * @param {*} params
   */
  static async authenticated (user, params) {
    return AuthServices.Account.regenerateSession(user, params, false)
  }

  /**
   * Logout the user and destroy the session
   *
   * @param {*} params
   */
  static async signout (params) {
    await models.sessions.delete(params.session)
    if (params.deviceId && params.deviceType) {
      const device = await models.devices
        .selectOne({ id: params.deviceId, type: params.deviceType })
      device && AuthServices.Device.delete(device)
    }
  }
}

module.exports = LoginController
