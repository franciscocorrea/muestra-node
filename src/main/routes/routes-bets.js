var controllers = require('../controllers')
var models = require('../models')

module.exports = (lindy) => {
  var bets = lindy.router('/api/bets')

  bets.post('/play', '[Deprecate] Creates a bet')
    .middleware('auth')
    .middleware('betsRules')
    .params((validate) => {
      validate.string('dates', 'Selected dates to play the bets. Preferred format is "DD/MM/YYYY HH:mm"').array()
      validate.string('bet', 'String representation of the bet, such as 13,17,35,41,42 E:6,11<br/>4,24,28,47,49 E:5,8').notEmpty()
      validate.number('price', 'Price of each ticket. Total = price * num')
      validate.number('num', 'Number of tickets to play')
      validate.string('game', 'Identifier of the game').notEmpty()
      validate.string('subscribe', 'Whether you want to subscribe to this bet or not ("true" or "false")').optional()
      validate.number('share', 'New amount of money to charge all users in a group').optional()
      validate.entity('group').model(models.groups).optional()
    })
    .run((params) => controllers.bets.play(params))

  bets.get('/list', 'List the bets of a user')
    .middleware('auth')
    .run((params) => controllers.bets.list(params))

  bets.get('/group', 'List the bets of a group')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
      validate.string('old', 'Whether you want to get old bets or not ("true" or "false")').optional()
    })
    .run((params) => controllers.bets.group(params))
}
