var controllers = require('../controllers')

module.exports = (lindy) => {
  var results = lindy.router('/api/results')

  results.get('/game', 'Get the results of a game in the given date')
    .params((validate) => {
      validate.string('game', 'The identifier of the game')
      validate.string('date', 'The date with format: DD/MM/YYYY')
    })
    .run((params) => controllers.results.find(params.game, params.date))

  results.get('/all', 'Get the latest results')
    .middleware('pagination')
    .params((validate) => {
    })
    .run((params) => controllers.results.all(params))

  results.get('/prev', 'Gets the previous results of a game given a date')
    .params((validate) => {
      validate.string('game', 'Game identifier')
      validate.string('date', 'The date with format: DD/MM/YYYY')
    })
    .run((params) => controllers.results.prev(params))

  results.get('/next', 'Get the next results of a game given a date')
    .params((validate) => {
      validate.string('game', 'Game identifier')
      validate.string('date', 'The date with format: DD/MM/YYYY')
    })
    .run((params) => controllers.results.next(params))
}
