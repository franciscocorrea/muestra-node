var request = require('request')
let moment = require('moment')

module.exports = (options, url) => {
  if (process.env.SEND_MESSAGE_SLACK === 'true') {
    if (typeof options === 'string') {
      options = {text: `${options} \n Enviroment: ${process.env.NODE_ENV} \n Time: ${moment().format('D/M/YY h:mm:ss a')}`}
    }
    var opts = {
      url: url || process.env.SLACK_WEBHOOK,
      method: 'POST',
      body: JSON.stringify(Object.assign({}, options, {}))
    }
    request(opts, (err, res, body) => {
      if (err) {
        console.warn(`Error while sending slack message err=${err}, body=${body}`)
      } else {
        console.warn(`Slack message sent. statusCode=${res.statusCode}, Slack response=${body}`)
      }
    })
  }
}
