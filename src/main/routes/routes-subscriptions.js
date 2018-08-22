var controllers = require('../controllers')
var models = require('../models')

module.exports = (lindy) => {
  var subscriptions = lindy.router('/api/subscriptions')

  subscriptions.post('/delete', 'Deletes a subscription')
    .middleware('auth')
    .params((validate) => {
      validate.entity('subscription').model(models.subscriptions)
    })
    .run((params) => controllers.subscriptions.delete(params))
}
