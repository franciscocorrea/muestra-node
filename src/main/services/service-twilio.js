exports.sendSms = (to, message) => {
  var client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  return new Promise((resolve, reject) => {
    client.messages.create({
      body: message,
      to: to,
      from: process.env.TWILIO_NUMBER_FROM
    }, (err, data) => {
      if (err) console.log('err', err.stack)
      err ? reject(err) : resolve(data)
    })
  })
}

if (module.id === require.main.id) {
  const path = require('path')
  require('dotenv').config({ path: path.join(__dirname, '../../.env') })
  exports.sendSms('+34625246481', 'hello world 3')
    .then((res) => {
      console.log('res', res)
    })
    .catch((err) => {
      console.log('err', err)
    })
}
