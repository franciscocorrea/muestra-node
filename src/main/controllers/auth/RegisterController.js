'use strict'

const AuthServices = require('../../services/auth')
const Services = require('../../services')
const models = require('../../models')
const db = models.seaquel
const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects

class RegisterController {
  /**
   * handled the new user register
   * @param {*} params
   */
  static async signup (params) {
    if (params.email.indexOf('@') < 0) {
      return rejects.badRequest('Introduce una dirección de correo electrónico válida')
    }
    let user = Object.assign({}, params)
    user.mobileVerificationCode = AuthServices.Tokenizer.randomToken()
    user.emailVerificationCode = await AuthServices.Tokenizer.randomCryptoToken()
    user.createdAt = new Date()
    delete user.deviceType
    delete user.deviceId
    delete user.versionNumber
    delete user.familyDevice
    delete user.versionLite
    const hash = await AuthServices.Hasher.hashPassword(params.email, params.password)
    user.password = hash
    try {
      user = await models.users.insert(user)
      await models.notificationBotes.insert({game: 'all', subscribe: true, userId: user.id})
      await models.notificationPrize.insert({subscribe: true, userId: user.id})
      await models.notificationNews.insert({subscribe: true, userId: user.id})
      const sessionData = await this.registered(user, params)

      return sessionData
    } catch (error) {
      if (error.message.indexOf('duplicate key') >= 0) {
        return AuthServices.Account.duplicate(params.email)
      }
      return rejects.internalError(error)
    }
  }

  /**
   * handled the user registration
   *
   * @param {*} user
   * @param {*} params
   */
  static async registered (user, params) {
    await Promise.all([
      user.email ? db.execute('UPDATE invitations SET "userId"=$1 WHERE email=$2 AND "userId" IS NULL', [user.id, user.email]) : Promise.resolve(null),
      user.mobile ? db.execute('UPDATE invitations SET "userId"=$1 WHERE mobile=$2 AND "userId" IS NULL', [user.id, user.mobile]) : Promise.resolve(null)
    ])
    if (user.email) {
      var fullName = `${user.firstName} ${user.lastName}`
      Services.email2.sendMail({
        to: user.email,
        subject: 'Bienvenido a LotterApp',
        template: 'welcome',
        context: {
          fullname: fullName,
          basePath: process.env.BASE_URL,
          emailVerificationCode: user.emailVerificationCode
        }
      })
    }
    const sessionData = await AuthServices.Account.regenerateSession(user, params, true)

    return sessionData
  }
}

module.exports = RegisterController
