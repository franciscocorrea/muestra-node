'use strict'

const Tpv = require('./').Tpv
const User = require('../../models').users
const errorHandler = require('../../exceptions/handler')

class UserCreditService {
  /**
   * class constructor
   * @param {*} user
   */
  constructor (user) {
    this.user = user
  }

  /**
   * add credict to the user acount
   * @param {*} amount
   */
  async add (amount) {
    console.log('[UserCredict Service] adding credit to user')
    this.user = await User.updateAndSelect({
      id: this.user.id,
      loadedCredit: this.user.loadedCredit + amount
    })
    console.log('[UserCredict Service] credit  added successfully to user')
    return {success: true}
  }

    /**
   * add credict to the user acount
   * @param {*} amount
   */
  async addFromPrize (amount) {
    console.log('[UserCredict Service] adding credit to user')
    this.user = await User.updateAndSelect({
      id: this.user.id,
      earnedCredit: this.user.earnedCredit + amount
    })
    console.log('[UserCredict Service] credit  added successfully to user')
    return {success: true}
  }

  /**
   * called when a credict card payment is proccessed
   * @param {*} amount
   * @param {*} creditCard
   */
  async addFromCreditCard (amount, creditCard) {
    console.log('[UserCredict Service] adding credit to user')
    this.user = await User.updateAndSelect({
      id: this.user.id,
      loadedCredit: this.user.loadedCredit + Number(amount),
      redsysMerchantIdentifier: creditCard.token,
      redsysExpiryDate: creditCard.expiryDate,
      cardNumber: creditCard.number
    })
    console.log('[UserCredict Service] credit  added successfully to user')
    return {success: true}
  }

  /**
   * deduct credict from the user account
   * @param {*} amount
   */
  async deduct (amount) {
    try {
      console.log('[UserCredict Service] deducting credict to user')
      let totalCredit = this.user.loadedCredit + this.user.earnedCredit
      if (totalCredit < amount) {
        const tvpTransaction = await this.chargeToTpv(amount - totalCredit)
        if (!tvpTransaction.success) {
          return {success: false, error: 'error de cobro al tpv'}
        }
        this.user = await User.selectOne({id: this.user.id})
        totalCredit = this.user.loadedCredit + this.user.earnedCredit
        if (totalCredit < amount) {
          return {success: false, error: 'Saldo insuficiente, intenta de nuevo'}
        }
      }
      const amountFromLoadedCredit = amount >= this.user.loadedCredit ? this.user.loadedCredit : amount
      const amountFromEarnedCredit = amount > this.user.loadedCredit ? amount - this.user.loadedCredit : 0
      this.user = await User.updateAndSelect({
        id: this.user.id,
        loadedCredit: this.user.loadedCredit - amountFromLoadedCredit,
        earnedCredit: this.user.earnedCredit - amountFromEarnedCredit
      })
      console.log('[UserCredict Service] credict deducted successfully to user')
      return {success: true}
    } catch (error) {
      errorHandler.report(error, 'User Credict Service: deduct')
      return {success: false, error: error.message}
    }
  }

  /**
   * charges the amount to the user credit card
   * @param {*} amount
   */
  async chargeToTpv (amount) {
    const TpvService = new Tpv(this.user)
    const payment = await TpvService.chargePayment(amount)

    return payment
  }
}

module.exports = UserCreditService
