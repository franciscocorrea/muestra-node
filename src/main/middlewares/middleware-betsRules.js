'use strict'

const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects
const pync = require('pync')

lindyhop.middleware('betsRules', async (req, res, options = {}, params) => {
  const dates = Array.isArray(req.body.dates) ? req.body.dates : [req.body.dates]
  const betsData = {
    dates,
    game: req.body.game,
    bets: [],
    total: (req.body.price * req.body.num) * dates.length
  }
  if (betsData.total > 5000) {
    return rejects.badRequest('Has superado el monto limite de 50€ para cada compra')
  }
  if (betsData.game === 'quiniela' && req.body.subscribe) {
    return rejects.badRequest('No se pueden generar suscripciones para la quiniela')
  }
  if (betsData.game === 'loteria') {
    if (betsData.dates.length > 1) {
      return rejects.badRequest('Solo puedes comprar un voleto de loteria a la vez')
    }
    if (betsData.dates[0].substring(0, 'DD/MM'.length) === '22/11') {
      return rejects.badRequest('La loteria de navidad no puede ser comprada modo suscripcion')
    }
    req.body.bet.split('<br/>').forEach((bet) => {
      const date = dates[0].substring(0, 'DD/MM/YYYY'.length)
      if (bet) {
        const [tenth, quantity] = bet.split(':')
        betsData.bets.push({
          game: betsData.game,
          date,
          quantity,
          bet,
          tenth,
          price: req.body.price,
          total: req.body.price * quantity,
          subscribe: req.body.subscribe
        })
      }
    })
  } else {
    await pync.series(dates, (date, index) => {
      betsData.bets.push({
        game: betsData.game,
        date: date.substring(0, 'DD/MM/YYYY'.length),
        quantity: req.body.num,
        bet: req.body.bet,
        price: req.body.price,
        total: req.body.price * req.body.num,
        subscribe: req.body.subscribe
      })
    })
  }
  params.betsData = betsData
})
