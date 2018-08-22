'use strict'

const Redsys = require('node-redsys-api').Redsys
const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })
const TpvTransactions = require('../../models').tvpTransactions
const moment = require('moment')

class Tpv {
  /**
   * class constructor
   * @param {*} user
   */
  constructor (user) {
    this.user = user
    this.baseUrl = process.env.BASE_URL
    this.merchantUri = `${this.baseUrl}/api/credit/webhook`
    this.successUri = `${this.baseUrl}/api/credit/success`
    this.failureUri = `${this.baseUrl}/api/credit/failure`
    this.currency = process.env.TPV_MERCHANT_CURRENCY
    this.tpvUri = process.env.TPV_URL
    this.tpvId = process.env.TPV_MERCHANT_CODE
    this.tpvTerminal = process.env.TPV_MERCHANT_TERMINAL
    this.tpvSecretKey = process.env.TPV_SECRET
  }

  /**
   * Builds the order of payment
   * @param {*} amount
   */
  buildOrder (amount) {
    console.log('[Tpv Service] building order')
    const data = {
      DS_MERCHANT_AMOUNT: String(amount),
      DS_MERCHANT_CURRENCY: this.currency,
      DS_MERCHANT_ORDER: this.generateOrderId(),
      DS_MERCHANT_MERCHANTCODE: this.tpvId,
      DS_MERCHANT_MERCHANTURL: this.merchantUri,
      DS_MERCHANT_URLOK: this.successUri,
      DS_MERCHANT_URLKO: this.failureUri,
      DS_MERCHANT_TERMINAL: this.tpvTerminal,
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_MERCHANTDATA: `userId:${this.user.id}`,
      DS_MERCHANT_IDENTIFIER: this.user.redsysMerchantIdentifier || 'REQUIRED',
      DS_MERCHANT_DIRECTPAYMENT: true
    }
    const redSys = new Redsys()
    const order = {}
    order.parameters = redSys.createMerchantParameters(data)
    order.signature = redSys.createMerchantSignature(this.tpvSecretKey, data)
    order.signatureVersion = 'HMAC_SHA256_V1'

    return order
  }

  /**
   * charges a payment to the user credit card
   * @param {*} amount
   */
  async chargePayment (amount) {
    if (!this.user.redsysMerchantIdentifier) {
      this.noCreditCardHandler(amount)
    }
    const order = this.buildOrder(amount)
    const params = {
      url: this.tpvUri,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
      },
      form: {
        Ds_MerchantParameters: order.parameters,
        Ds_SignatureVersion: order.signatureVersion,
        Ds_Signature: order.signature
      }
    }
    const response = await request(params)
    const [, body] = response
    if (body.indexOf('RSisSelFormaPago') > 0) {
      this.noCreditCardHandler(amount)
    }
    if (body.indexOf('RSisException') > 0) {
      this.invalidCreditCardHandler(amount)
    }
    return {success: true}
  }

  /**
   * proccess a payment from credit card
   * @param {*} data
   */
  static async processPayment (data) {
    console.log('[TPV Service] processing payment')
    const redsys = new Redsys()
    const parameters = redsys.decodeMerchantParameters(data.parameters)
    const signature = redsys.createMerchantSignatureNotif(process.env.TPV_SECRET, data.parameters)
    const valid = redsys.merchantSignatureIsValid(data.signature, signature)
    const response = +parameters.Ds_Response
    const session = parameters.Ds_MerchantData
    const prefix = 'userId:'
    if (!valid) {
      throw new Error('invalid signature on payment')
    }
    if (response == null || response > 99) {
      throw new Error('unsuccefull response')
    }
    if (!session) {
      throw new Error('session not found')
    }
    if (session.indexOf(prefix) !== 0) {
      throw new Error('invalid session')
    }
    const transaction = await TpvTransactions.insert({
      userId: session.substring(prefix.length),
      token: parameters.Ds_Merchant_Identifier,
      order: parameters.Ds_Order,
      amount: parameters.Ds_Amount,
      cardBrand: parameters.Ds_Card_Brand,
      cardNumber: parameters.Ds_Card_Number,
      expiryDate: parameters.Ds_ExpiryDate,
      processedAt: moment(`${parameters.Ds_Date} ${parameters.Ds_Hour}`, 'DD/MM/YYYY HH:mm'),
      createdAt: new Date()
    })
    const payment = {
      transaction,
      success: true,
      userId: session.substring(prefix.length),
      amount: parameters.Ds_Amount,
      creditCard: {
        token: parameters.Ds_Merchant_Identifier,
        expiryDate: parameters.Ds_ExpiryDate,
        number: parameters.Ds_Card_Number
      }
    }

    return payment
  }

  /**
   * generates the order id
   */
  generateOrderId () {
    const now = String(Date.now())
    return now.substring(now.length - 12)
  }

  /**
   * called when user hasn't a credit card
   * @param {*} amount
   */
  noCreditCardHandler (amount) {
    throw new Error(`El usuario: ${this.user.id}, no posee pago por referencia`)
  }

  /**
   * called when user has an invalid credit card
   */
  invalidCreditCardHandler (amount) {
    throw new Error(`El usuario: ${this.user.id}, posee una tarjeta de credito invalida`)
  }
}

module.exports = Tpv
