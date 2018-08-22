var nodemailer = require('nodemailer')
var ses = require('nodemailer-ses-transport')
var AWS = require('aws-sdk')

if (module.id === require.main.id) {
  const path = require('path')
  require('dotenv').config({ path: path.join(__dirname, '../../.env') })
}

var region = process.env.AWS_REGION
if (!region) {
  region = 'us-east-1'
  console.warn('NO AWS_REGION found. Using', region)
}
AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
  region: region
})

var transporter = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
  ? nodemailer.createTransport(ses({ ses: new AWS.SES() }))
  : nodemailer.createTransport() // direct

exports.sendMail = (options) => {
  options.from = process.env.EMAIL_FROM
  return new Promise((resolve, reject) => {
    transporter.sendMail(options, (err, info) => {
      if (err) {
        reject(err)
        return console.log(err)
      }
      console.log('Message sent:', info)
      resolve(info)
    })
  })
}

if (module.id === require.main.id) {
  exports.sendMail({
    to: 'gimenete@gmail.com',
    subject: 'Hello world',
    text: 'Hello world :)'
  })
  .then((res) => {
    console.log('res', res)
  })
  .catch((err) => {
    console.log('err', err)
  })
}
