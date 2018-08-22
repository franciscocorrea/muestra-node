'use strict'

const AuthServices = require('../../services/auth')
const models = require('../../models')
const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects

class ResetPasswordController {
  static async reset (params) {
    const user = await models.users
      .selectOne({ email: params.email, 'forgotPasswordDate >': new Date() })
    if (!user || user.forgotPasswordCode !== params.code) {
      return rejects.badRequest('Código de verificación o email incorrectos o expirados')
    }
    const hash = await AuthServices.Hasher.hashPassword(params.email, params.password)
    await models.users.update({
      id: user.id,
      forgotPasswordDate: null,
      forgotPasswordCode: null,
      password: hash
    })

    return {}
  }
}

module.exports = ResetPasswordController
