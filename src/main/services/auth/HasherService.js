'use strict'

const scrypt = require('scrypt')
const scryptParameters = scrypt.paramsSync(0.1)

exports.hashPassword = async (email, pass) => {
  pass = email + '#' + pass
  const result = await scrypt.kdf(pass, scryptParameters)
  return result.toString('base64')
}

exports.checkPassword = (email, pass, hash) => {
  pass = email + '#' + pass
  return scrypt.verifyKdf(Buffer.from(String(hash), 'base64'), pass)
}
