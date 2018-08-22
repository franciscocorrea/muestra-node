const services = require('./')
const models = require('../models')
const pync = require('pync')
const bets = models.bets
const db = require('../models').seaquel
const incr = require('seaquel').incr
const moment = require('moment')
const controllers = require('../controllers')
const notification = require('../notifications')

let gadminSession = null

const openSession = () => {
  return new Promise((resolve, reject) => {
    if (gadminSession) {
      return resolve()
    }
    services.gadminApi.login().then((session) => {
      gadminSession = session
      return resolve()
    })
  })
}

const closeSession = () => {
  gadminSession = null
}

exports.checkForBetsWithSpecialCharacters = () => {
  console.log('[service bet] starting check for bets with specials characters *')
  return db.queryAll('SELECT * FROM "public"."bets" WHERE "bet" LIKE \'%*%\' ORDER BY "createdAt" DESC LIMIT 1000 OFFSET 0')
    .then((results) => {
      pync.series(results, async (bet) => {
        await openSession().then(async() => {
          let response = await services.gadminApi.findOrder(bet.externalId, gadminSession)
          let betCombination = decodeURIComponent(response.pedido[0].items[0].lottery[0].item[0].numero[0])
          if (bet.bet.substring(0, 4) !== betCombination) {
            console.log(`[service bet] updating bet: ${bet.id} with bet combination: ${betCombination}`)
            bets.update({id: bet.id, bet: `${betCombination}:${bet.num}`})
          }
        })
      }).then(() => {
        closeSession()
        console.log('[service bet] check for random bets executed with success')
      })
    })
}

exports.addNewDataForBetsEuromillones = () => {
  console.log('[service bet] starting check for bets with euromillones *')
  return db.queryAll('SELECT * FROM "public"."bets" WHERE ("game" = \'euromillones\' AND "validationDate" IS NOT NULL)  AND ("lluvia" IS NULL AND "millones" IS NULL) AND "createdAt" > CURRENT_DATE - INTERVAL \'30\' DAY  ORDER BY "createdAt" DESC LIMIT 1000 OFFSET 0')
        .then((results) => {
          pync.series(results, async (bet) => {
            let response = await services.gadminApi.validateBet(bet.externalId)
            if (response.validaciones[0] !== '') {
              if (response.validaciones[0].validacion[0].cod_apuestas1 && !bet.millones) {
                var millones = response.validaciones[0].validacion[0].cod_apuestas1[0]
                console.log(`[service bet] updating bet: ${bet.id} with data millones: ${millones}`)
                bets.update({id: bet.id, millones: millones})
              }

              if (response.validaciones[0].validacion[0].cod_apuestas2 && !bet.lluvia) {
                var lluvia = response.validaciones[0].validacion[0].cod_apuestas2[0]
                console.log(`[service bet] updating bet: ${bet.id} with data lluvia de millones: ${lluvia}`)
                bets.update({id: bet.id, lluvia: lluvia})
              }
            }
          }).then(() => {
            console.log('[service bet] adding new data to euromillones bets executed with success')
          })
        })
}

exports.validate = async () => {
  console.log('[service bet] starting bets validation')
  const validator = async (bet) => {
    const response = await services.gadminApi.validateBet(bet.externalId)
    let validation = response.validaciones[0]
    validation = validation && validation.validacion
    validation = validation && validation[0]
    if (validation) {
      const getValue = (key) => {
        let value = validation[key]
        if (value && value.length > 0) return value[0]
        return null
      }
      let validationDate = getValue('fechaValidacion')
      if (validationDate) {
        bet.validationDate = moment(validationDate, 'DD/MM/YYYY HH:mm:ss') || null
      }
      if (!bet.escrutado) {
        const result = await controllers.results.find(bet.game, bet.date)
        bet.escrutado = result.result && !!result.result.escrutado
        bet.scrutinizedAt = result.result && !!result.result.escrutado ? new Date() : null
      }
      let prize = +getValue('premio') || null
      prize = prize && (prize * 100).toFixed(0)
      bet.prize = prize
      bet.reintegro = getValue('reintegro')
      bet.joker = getValue('joker')

      // await notification.push_results_cc.notify(bet)

      if (bet.prize && !bet.paid) {
        if (!bet.groupId && bet.userId) {
          const user = await models.users.selectOne({ id: bet.userId })
          await services.transactions.store(bet.prize, 'prize', `Ingreso por premio ${bet.game}`, user, null, bet)
          await models.users.update({ id: user.id, credit: incr(bet.prize) })
          bet.paid = true
          bet.paidAt = new Date()
        } else if (bet.groupId && !bet.userId) {
          const group = await models.groups.selectOne({ id: bet.groupId })
          await services.transactions.store(bet.prize, 'prize', `Ingreso por premio ${bet.game}`, null, group, bet)
          await models.groups.update({ id: group.id, credit: incr(bet.prize) })
          await services.groups.updateFields(group)
          bet.paid = true
          bet.paidAt = new Date()
        }
      }
    }
    bet.lastValidation = new Date()
    if (!bet.result) {
      const betResult = await controllers.results.find(bet.game, bet.date)
      if (betResult) {
        bet.result = betResult.result || null
      }
    }
    bets.update(bet)
  }
  let unvalidatedBets = await db.queryAll('SELECT * FROM "public"."bets" WHERE "escrutado" is FALSE OR "escrutado" is NULL ORDER BY "date" ASC LIMIT 1000 OFFSET 0')
  await pync.series(unvalidatedBets, async (bet) => {
    if (bet.validationDate && bet.result && bet.escrutado) return
    if (bet.lastValidation !== null && Date.now() - bet.lastValidation.getTime() < 60 * 60 * 1000) return
    await validator(bet)
  })
  console.log('[service bet] bets validation executed with success')
}
