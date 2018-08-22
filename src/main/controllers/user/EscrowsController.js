'use strict'

const errorHandler = require('../../exceptions/handler')
const Tpv = require('../../services/money').Tpv
const Transaction = require('../../services/money').Transaction
const CredictService = require('../../services/money').UserCredit
const Users = require('../../models').users

class EscrowsController {
  /**
   * store a new payment form user
   * @param {*} params
   */
  static async store (params) {
    try {
      const payment = await Tpv.processPayment(params)
      if (payment.success) {
        const user = await Users.selectOne({id: payment.userId})
        const creditService = new CredictService(user)
        const creditLoad = await creditService
          .addFromCreditCard(payment.amount, payment.creditCard)
        if (creditLoad.success) {
          Transaction
            .fromUser(payment.amount, 'tpv', 'Ingresado', user)
        }
        return {success: true}
      }
      return {success: false}
    } catch (error) {
      errorHandler.report(error, 'User Credict Service: add')
      return {success: false}
    }
  }
}

module.exports = EscrowsController
