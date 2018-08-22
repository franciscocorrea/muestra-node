const models = require('../models')
const db = models.seaquel
const services = require('../services')
const pync = require('pync')
const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects
const moment = require('moment')
const incr = require('seaquel').incr
const notification = require('../notifications')
const Controllers = require('../controllers/user')

var times = {
  primitiva: 19,
  bonoloto: 19,
  gordo: -12, // -11:30
  euromillones: 19,
  quiniela: -7
}

var addTime = (game, date) => {
  var time = times[game]
  var min = 0
  if (game === 'loteria') {
    var day = date.day()
    if (day === 6) time = 13 // saturday
    else if (day === 4) time = 21 // thursday
    // This is not exactly the closing time, but...
    if (date.date() === 22 && date.month() === 11) {
      time = 8
      min = 30
    }
  }
  return date.add(time, 'hour').add(min, 'minute')
}

module.exports = class BetsController {
  static async play (params) {
    if (!params.group) {
      return Controllers.Bets.store(params)
    }
    var user = params.user
    var group = params.group
    var dates = params.dates
    var bet = params.bet
    var price = params.price
    var game = params.game
    var num = params.num
    var amount = price * num
    var total = amount * dates.length
    var _game = game
    var groupBote
    if (total > 5000) {
      return rejects.badRequest('Las compras están limitadas a 50€')
    }

    if (game === 'gordo') _game = 'gordo_primitiva'
    if (game === 'loteria') _game = 'lottery'
    var bets = []
    var description = `Compra ${game.substring(0, 1).toUpperCase()}${game.substring(1)}`
    if (game === 'loteria') {
      if (dates.length > 1) {
        return rejects.badRequest('A la lotería sólo se puede jugar un día cada vez')
      }
      var decimos = []
      var decimosCount = []
      var decimosClients = []
      var decimosSorteos = []
      bet.split('<br/>').forEach((item) => {
        if (item) {
          var [decimo, count, client, sorteo] = item.split(':')
          decimos.push(decimo.trim())
          decimosCount.push(+count.trim())
          decimosClients.push(client)
          decimosSorteos.push(sorteo)
        }
      })

      var date = dates[0]
      num = decimosCount.reduce((total, n) => total + n, 0)
      amount = price * num
      total = amount // only one date
      dates = decimos.map(() => date) // N times the same date
    }

    if (game === 'quiniela' && params.subscribe === 'true') {
      return rejects.badRequest('No se puede hacer una suscripción a la quiniela')
    }

    for (date of dates) {
      date = moment(date.substring(0, 'DD/MM/YYYY'.length), 'DD/MM/YYYY')
      if (addTime(game, date) < new Date()) {
        return rejects.badRequest('Lo sentimos, la apuesta no se puede realizar porque el horario para este sorteo ya ha vencido')
      }
    }

    var closingDates = dates.map((date) => {
      var betDate = services.dates.parseDate(date.substring(0, 'DD/MM/YYYY'.length))
      return addTime(game, betDate).toDate()
    })
    var minDate = closingDates.reduce((min, date) => !min || min > date ? date : min, null)

    const checkCurrentBets = async () => {
      const bets = await models.bets.selectAll({
        groupId: group.id,
        'date >': new Date(),
        'userId is': null
      }, { limit: 1 })

      if (!params.subscriptionId && bets.length > 0) {
        return rejects.badRequest('No puedes jugar hasta que venzan las apuestas en curso')
      }
      return bets
    }

    const startCampaignIfPreviousBets = async (share) => {
      const prevBets = await models.bets.selectAll({
        groupId: group.id,
        'date <': new Date(),
        'userId is': null
      }, { limit: 1 })
      if (prevBets.length > 0) {
        if (!share) {
          return rejects.badRequest('Debes iniciar una nueva campaña de fondos')
        }
        if (share < total) {
          return rejects.badRequest(`Debes iniciar una campaña de al menos ${total / 100}€ por aportación`)
        }
        return services.groups.startCampaign(group, share, user, minDate)
      }
    }

    return db.transaction(async () => {
      if (group) {
        await checkCurrentBets()
        if (group.credit < total) {
          await startCampaignIfPreviousBets(params.share)
        }
        return services.credit.creditGroup(group, 'bet', total, description)
      } else {
        return services.credit.creditUser(user, 'bet', total, null, description)
      }
    })
    .then((transaction) => {
      return pync.series(dates, (date, index) => {
        var betDate = services.dates.parseDate(date)
        date = date.substring(0, 'DD/MM/YYYY'.length)
        if (game === 'loteria') {
          var time = 0
          var min = 0
          var day = betDate.day()
          if (day === 6) time = 13 // saturday
          else if (day === 4) time = 21 // thursday
          if (betDate.date() === 22 && betDate.month() === 11) {
            time = 8
            min = 30
          }
          betDate.add(time, 'hour').add(min, 'minute')
        }
        var query = ''
        if (game === 'loteria') {
          num = decimosCount[index]
          amount = price
          query = `
            <Query>
              <pass>${encodeURI(process.env.GADMIN_PASS)}</pass>
              <user>${encodeURI(process.env.GADMIN_USER)}</user>
              <enviaremail>no</enviaremail>
              <items>
                <item>
                  <cantidadDet>1</cantidadDet>
                  <descripcionDet>nodeff</descripcionDet>
                  <fechaSorteo>${encodeURI(date)}</fechaSorteo>
                  <idReferencia>${_game}</idReferencia>
                  <precioDet>${(amount / 100).toFixed(2)}</precioDet>
                  <decimos>
                    <decimo>
                      <numero>${decimos[index]}</numero>
                      <cantidad>${num}</cantidad>
                    </decimo>
                  </decimos>
                </item>
              </items>
            </Query>
          `
        } else {
          query = `
            <Query>
              <pass>${encodeURI(process.env.GADMIN_PASS)}</pass>
              <user>${encodeURI(process.env.GADMIN_USER)}</user>
              <enviaremail>no</enviaremail>
              <items>
                <item>
                  <cantidadDet>${num}</cantidadDet>
                  <descripcionDet>${encodeURIComponent(bet)}</descripcionDet>
                  <fechaSorteo>${encodeURI(date)}</fechaSorteo>
                  <idReferencia>${_game}</idReferencia>
                  <precioDet>${(amount / 100).toFixed(2)}</precioDet>
                </item>
              </items>
            </Query>
          `
        }
        return services.gadmin('ConsultaBotes', `<Query><juego>${_game}</juego><fecha>${encodeURI(date)}</fecha></Query>`)
          .then((botes) => {
            var subscriptionId = null
            var bote = null
            try {
              bote = +botes.bote[0].importe[0] || null
            } catch (err) {
              console.log('err', err.stack)
            }
            groupBote = bote || groupBote

            return Promise.resolve()
              .then(() => {
                var client = decimosClients && decimosClients[index]
                var sorteo = decimosSorteos && decimosSorteos[index]
                if (client && sorteo) {
                  console.log('gadmin 2')
                  return {id: [437734]}
                  /* return services.gadmin2.buy({
                    client,
                    sorteo,
                    count: decimosCount[index],
                    number: decimos[index],
                    date
                  }) */
                } else {
                  console.log('gadmin 1')
                  return {id: [437734]}
                  /* return services.gadmin('addAndPay', query)
                    .then((result) => {
                      var status = result.status && result.status[0]
                      if (status !== 'OK') {
                        var message = (result.message && result.message[0]) || 'Unknown error'
                        var n = message.indexOf(':')
                        if (n > 0) {
                          message = message.substring(n + 1)
                        }
                        return rejects.badRequest(`Error de GAdmin: ${message} ${query}`)
                      }
                      return result
                    }) */
                }
              })
              .then((result) => {
                var id = result.id[0]
                var playBet = game !== 'loteria' ? bet : `${decimos[index]}:${decimosCount[index]}`
                return models.bets.insert({
                  groupId: group && group.id,
                  userId: group ? null : user.id,
                  transactionId: transaction.id,
                  bet: playBet,
                  game,
                  num,
                  date: betDate,
                  createdAt: new Date(),
                  externalId: id,
                  price: price,
                  bote: bote,
                  gadminUser: process.env.GADMIN_USER
                })
                .then(async (bet) => {
                  transaction.betId = bet.id
                  await models.transactions.update(transaction)
                  return Promise.resolve()
                    .then(() => {
                      if (params.subscriptionId) {
                        subscriptionId = params.subscriptionId
                        return models.bets.update({
                          id: bet.id,
                          subscriptionId: params.subscriptionId,
                          subscription: true
                        })
                      }
                      if (params.subscribe !== 'true') return
                      return models.subscriptions.insert({
                        groupId: group && group.id,
                        userId: group ? null : user.id,
                        date: betDate,
                        betId: bet.id
                      })
                      .then((subscription) => {
                        subscriptionId = bet.subscriptionId = subscription.id
                        return models.bets.update({
                          id: bet.id,
                          subscriptionId: subscription.id,
                          subscription: true
                        })
                      })
                    })
                    .then(() => bet)
                })
                .then(async (_bet) => {
                  bets.push(_bet)
                  if (!group) return _bet
                  return models.memberships.selectAll({
                    groupId: group.id,
                    'latestPayment >': group.latestCampaign,
                    pendingPayments: 0
                  })
                    .then((memberships) => {
                      return pync.series(memberships, (membership) => (
                        models.bets.insert({
                          groupId: group && group.id,
                          userId: membership.userId,
                          transactionId: transaction.id,
                          bet: playBet,
                          game,
                          num,
                          date: betDate,
                          createdAt: new Date(),
                          externalId: id,
                          price: price,
                          bote: bote,
                          subscriptionId: subscriptionId,
                          subscription: !!subscriptionId,
                          gadminUser: process.env.GADMIN_USER
                        })
                      ))
                    })
                    .then(() => _bet)
                })
              }, (err) => {
                var message = err.stack || err.message || String(err)
                console.error(message)
                services.slack(`Error en apuesta: ${message}`)

                if (group) {
                  return models.groups.update({ id: group.id, credit: incr(amount) })
                    .then(() => {
                      return models.transactions.insert({
                        description: 'Devolución por error al hacer apuesta',
                        userId: user && user.id,
                        groupId: group && group.id,
                        amount,
                        type: 'bet',
                        createdAt: new Date(),
                        previousCredit: group.credit,
                        betId: bet && bet.id
                      })
                    })
                } else {
                  return models.users.update({ id: user.id, credit: incr(amount) })
                    .then(() => {
                      return models.transactions.insert({
                        description: 'Devolución por error al hacer apuesta',
                        userId: user && user.id,
                        amount,
                        type: 'bet',
                        createdAt: new Date(),
                        previousCredit: user.credit,
                        betId: bet && bet.id
                      })
                    })
                }
              })
          })
      })
    })
    .then(() => {
      if (bets.length === 0) return rejects.internalError('No se pudo llevar a cabo la petición. Inténtelo más tarde')
      if (!group) return
      return models.groups.update({id: group.id, latestBetDate: minDate, latestBetBote: groupBote, game: game})
            .then((groupUpdated) => {
              return models.invitations.selectAll({groupId: group.id})
                    .then((results) => {
                      pync.series(results, async (invitation) => {
                        if (results !== undefined) {
                          if (group && !invitation.expiresAt) {
                            notification.email_group_cc.notify(minDate, invitation, group, user)
                          }
                          return Promise.all([
                            db.execute(`
                                        UPDATE invitations
                                        SET "expiresAt" = $2
                                        WHERE "expiresAt" IS NULL AND "groupId"=$1
                                `, [group.id, minDate])
                          ])
                        }
                      })
                    })
            })
    })
    .then(() => ({ bets }))
  }

  static list (params) {
    return models.bets.selectAll({
      userId: params.user.id
    }, { limit: 1000, orderBy: 'date ASC' })
      .then((bets) => {
        return { bets }
      })
  }

  static group (params) {
    const constraint = params.old === 'true' ? 'date <' : 'date >'
    return models.bets.selectAll({
      groupId: params.group.id,
      [constraint]: new Date(),
      'userId is': null
    }, { limit: 1000, orderBy: 'date ASC' })
      .then((bets) => {
        services.bet.validate(bets)
        return { bets }
      })
  }
}
