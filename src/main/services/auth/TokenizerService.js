'use strict'

const pify = require('pify')
const crypto = require('crypto')

/**
 * generate a random token
 */
exports.randomToken = () => {
  const str = String(Math.random())

  return str.substring(str.length - 6)
}

/**
 * generate a crypto token
 */
exports.randomCryptoToken = async () => {
  const token = await pify(crypto.randomBytes)(42)

  return token.toString('hex')
}
