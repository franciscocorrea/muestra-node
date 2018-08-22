'use strict'

var moment = require('moment')
const rejects = require('lindyhop').rejects
const User = require('../../models').users
const Services = require('../../services')
const dedent = require('dedent')
const Withdrawal = require('../../models').withdrawals
const ErrorHandler = require('../../exceptions/handler')
const Transaction = require('../../services/money').Transaction

class WithdrawlsController {
    /**
     * Withdrawls amount.
     *
     * @param {*} params
     */
  static async store (params) {
    const user = params.user
    const amount = params.amount

    if (!user.bankAccount) {
      return rejects.badRequest('Debe configurar el IBAN, en configuración de su cuenta')
    }

    if ((user.earnedCredit - amount) < 0) {
      return rejects.badRequest('No tienes saldo suficiente en premios para realizar el retiro.')
    }
    try {
      user.earnedCredit = user.earnedCredit - amount
      await User.update(user)
      const withdrawals = await Withdrawal.insert({
        userId: user.id,
        amount: amount,
        ibn: user.bankAccount,
        createdAt: new Date()
      })

      await Transaction.fromUser(-amount, 'withdraw', 'Retiro de premios', user)
      this.sendDataEmailWithdrawals(withdrawals, user)
      return {success: true, message: 'El retiro ha sido procesado con éxito'}
    } catch (error) {
      ErrorHandler.report(error, 'Withdrawls controller: store')
      return rejects.badRequest(error.message)
    }
  }

    /**
     * send a data withdrawals in email
     *
     * @param {*} withdrawals
     * @param {*} user
     */
  static sendDataEmailWithdrawals (withdrawals, user) {
    Services.email.sendMail({
      to: 'hola@lotterapp.com',
      subject: 'Solicitud de retiro de premio',
      text: dedent`
        El usuario: ${user.firstName} ${user.lastName}, ID: ${user.id}
        Has solicitado retiro de premio por ${(withdrawals.amount) / 100} €, el dia ${moment(withdrawals.createdAt).format('dddd')} ${moment(withdrawals.createdAt).format('DD')} de ${moment(withdrawals.createdAt).format('MMMM')} a las  ${moment(withdrawals.createdAt).format('HH:mm')}
      `
    })
  }
}

module.exports = WithdrawlsController
