'use strict'

const AuthServices = require('../../services/auth')
const Services = require('../../services')
const models = require('../../models')
const dedent = require('dedent')
const moment = require('moment')

class ForgotPasswordController {
  /**
   * Handled the user request for password forgeted
   * @param {*} params
   */
  static async forgot (params) {
    const user = await models.users.selectOne({ email: params.email })
    if (!user) {
      this.sendPublicityEMail(params.email)
      return
    }
    const resetPasswordToken = AuthServices.Tokenizer.randomToken()
    await models.users.update({
      id: user.id,
      forgotPasswordDate: moment().add(1, 'day').toDate(),
      forgotPasswordCode: resetPasswordToken
    })
    this.sendResetPasswordEmail(user, resetPasswordToken)

    return {}
  }

  /**
   * send a publicity email to emails no finded
   *
   * @param {*} email
   */
  static sendPublicityEMail (email) {
    Services.email.sendMail({
      to: email,
      subject: 'Recupera tu contraseña LotterApp',
      text: dedent`
        Hola,
        Has solicitado recuperar tu contraseña, pero no nos consta que estés registrado en LotterApp. Puedes registrarte creando una nueva cuenta directamente desde la App.
        Estás recibiendo este mensaje porque has solicitado recuperar tu contraseña de LotterApp. Si tu no lo has hecho, ignora este email.
      `
    })
  }

  /**
   * Sends the password reset token for email to the user.
   *
   * @param {*} user
   * @param {*} resetPasswordToken
   */
  static sendResetPasswordEmail (user, resetPasswordToken) {
    const fullName = `${user.firstName} ${user.lastName}`
    Services.email.sendMail({
      to: user.email,
      subject: 'Recupera tu contraseña LotterApp',
      text: dedent`
        Hola ${fullName},
        Para establecer una nueva contraseña en LotterApp debes introducir el siguiente código ${resetPasswordToken} en la aplicación.
        Estás recibiendo este mensaje porque has solicitado recuperar tu contraseña de LotterApp. Si tu no lo has hecho, ignora este email
      `
    })
  }
}

module.exports = ForgotPasswordController
