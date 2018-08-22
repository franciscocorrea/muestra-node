var Bets = require('../../controllers/user').Bets

module.exports = (lindy) => {
  const bets = lindy.router('/api/users/bets')

  bets.get('/', 'List the bets of a user')
    .middleware('auth')
    .run((params) => Bets.index(params))

  bets.post('/', 'Store a bet')
    .middleware('auth')
    .middleware('betsRules')
    .params((validate) => {
      validate.string('dates', 'Selected dates to play the bets. Preferred format is "DD/MM/YYYY HH:mm"').array()
      validate.string('bet', 'String representation of the bet, such as 13,17,35,41,42 E:6,11<br/>4,24,28,47,49 E:5,8').notEmpty()
      validate.number('price', 'Price of each ticket. Total = price * num')
      validate.number('num', 'Number of tickets to play')
      validate.string('game', 'Identifier of the game').notEmpty()
      validate.string('subscribe', 'Whether you want to subscribe to this bet or not ("true" or "false")').optional()
    })
    .run((params) => Bets.store(params))
}
