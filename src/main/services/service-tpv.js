const Redsys = require('node-redsys-api').Redsys
const notificator = require('../notifications')
const models = require('../models')
const moment = require('moment')
const pify = require('pify')
const request = pify(require('request'), { multiArgs: true })
const rejects = require('lindyhop').rejects

let baseUrl = process.env.BASE_URL
let merchantUri = `${baseUrl}/api/credit/webhook`
let successUri = `${baseUrl}/api/credit/success`
let failureUri = `${baseUrl}/api/credit/failure`
let currency = process.env.TPV_MERCHANT_CURRENCY
let tpvUri = process.env.TPV_URL
let tpvId = process.env.TPV_MERCHANT_CODE
let tpvTerminal = process.env.TPV_MERCHANT_TERMINAL
let tpvSecretKey = process.env.TPV_SECRET

const generateOrderId = () => {
  var now = String(Date.now())
  return now.substring(now.length - 12)
}

const updateItem = (item, isGroup = false) => {
  if (isGroup) {
    models.memberships.update({item})
  } else {
    models.subscriptions.update(item)
  }
}

exports.buildOrder = (user, amount) => {
  console.log('[service tpv] building order')
  let data = {
    DS_MERCHANT_AMOUNT: String(amount),
    DS_MERCHANT_CURRENCY: currency,
    DS_MERCHANT_ORDER: generateOrderId(),
    DS_MERCHANT_MERCHANTCODE: tpvId,
    DS_MERCHANT_MERCHANTURL: merchantUri,
    DS_MERCHANT_URLOK: successUri,
    DS_MERCHANT_URLKO: failureUri,
    DS_MERCHANT_TERMINAL: tpvTerminal,
    DS_MERCHANT_TRANSACTIONTYPE: '0',
    DS_MERCHANT_MERCHANTDATA: `userId:${user.id}`,
    DS_MERCHANT_IDENTIFIER: user.redsysMerchantIdentifier || 'REQUIRED',
    DS_MERCHANT_DIRECTPAYMENT: true
  }
  let redSys = new Redsys()
  let order = {}
  order.parameters = redSys.createMerchantParameters(data)
  order.signature = redSys.createMerchantSignature(tpvSecretKey, data)
  order.signatureVersion = 'HMAC_SHA256_V1'
  console.log('[service tpv] order builded successfully')

  return order
}

exports.chargeUser = (user, amount, date, name, isGroup, item) => {
  console.log(`[service tpv] charging: ${amount}  to user: ${user.id}`)
  date = moment(date)
  if ((date.day() === 6)) {
    date = date.add(-1, 'days')
  } else if ((date.day() === 0)) {
    date = date.add(-2, 'days')
  }
  date.set('hour', 19)
  date.set('minute', 0)
  let data = {
    date: date,
    betType: isGroup ? 'aportación' : 'apuesta',
    name: name
  }
  if (!user.redsysMerchantIdentifier) {
    item.failed_pay = true
    updateItem(item, isGroup)
    notificator.tpv_no_cc.notify(user, data)

    return rejects.badRequest(`El usuario no tiene pago por referencia. user.id=${user.id}`)
  }
  return Promise.resolve().then(() => {
    let params = exports.buildOrder(user, amount)
    let req = {
      url: tpvUri,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
      },
      form: {
        Ds_MerchantParameters: params.parameters,
        Ds_SignatureVersion: params.signatureVersion,
        Ds_Signature: params.signature
      }
    }
    return request(req).then((response) => {
      let [, body] = response
      if (body.indexOf('RSisException') > 0) {
        user.redsysMerchantIdentifier = null
        models.users.update(user)
        notificator.tpv_invalid_cc.notify(user, data)
        item.failed_pay = true
        updateItem(item, isGroup)

        return rejects.badRequest(`Error al procesar el pago. user.id=${user.id}`)
      }
      if (body.indexOf('RSisSelFormaPago') > 0) {
        return rejects.badRequest(`El usuario no tiene pago por referencia. user.id=${user.id}`)
      }
    }).then(() => {})
  })
}
