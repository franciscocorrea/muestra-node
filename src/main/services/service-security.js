var scrypt = require('scrypt')
var scryptParameters = scrypt.paramsSync(0.1)

exports.hashPassword = (email, pass) => {
  pass = email + '#' + pass
  return scrypt.kdf(pass, scryptParameters)
    .then((result) => result.toString('base64'))
}

exports.checkPassword = (email, pass, hash) => {
  pass = email + '#' + pass
  return scrypt.verifyKdf(Buffer.from(String(hash), 'base64'), pass)
}
