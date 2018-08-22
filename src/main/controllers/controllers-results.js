var services = require('../services')
var moment = require('moment')

const decode = (str) => {
  try {
    str = str
      .replace(/%C0/g, 'À')
      .replace(/%C1/g, 'Á')
      .replace(/%C9/g, 'É')
      .replace(/%CD/g, 'Í')
      .replace(/%D3/g, 'Ó')
      .replace(/%D1/g, 'Ñ')
    return decodeURIComponent(str)
  } catch (err) {
    return str
  }
}

const times = {
  euromillones: '22:00',
  primitiva: '21:40',
  gordo: '21:30',
  bonoloto: '21:30',
  quiniela: '21:30', // no se sabe
  loteria: '22:00' // no se sabe
}

const parseDates = (game, value) => {
  if (typeof value === 'string') {
    return [{
      date: services.dates.parseDate(value, times[game])
    }]
  } else if (Array.isArray(value) && value.length > 0) {
    return value.map((value) => ({
      type: value.$ && value.$.tipo,
      date: services.dates.parseDate(value._, times[game])
    }))
  }
}

const parseGame = (obj, ignoreWeekly) => {
  var game = obj.$.juego
  if (game === 'gordo_primitiva') return 'gordo'
  if (game === 'primitiva_g') return 'gordo'
  if (game.endsWith('_semanal') || game.endsWith('_j') || game.endsWith('_s')) {
    return ignoreWeekly ? null : game.split('_')[0]
  }
  return game
}

var single = [
  'matriz',
  'complementario',
  'reintegro',
  'primero',
  'serie',
  'fraccion',
  'segundo',
  'tercero',
  'cuartos',
  'quintos',
  'reintegros',
  'pedrea',
  'joker',
  'clave'
]

const parseCombination = (obj) => {
  Object.keys(obj).forEach((key) => {
    if (single.indexOf(key) >= 0) {
      var value = obj[key]
      if (Array.isArray(value) && value.length > 0) {
        obj[key] = value[0]
      }
    }
  })
  return obj
}

const parseCombinationQuiniela = (result) => {
  var matches = []
  var combinacion = result.combinacion[0] || {}
  var encuentros = result.encuentros[0] || {}
  Object.keys(combinacion).forEach((key) => {
    if (key.startsWith('partido')) {
      var num = +key.substring('partido'.length)
      var res = combinacion[key]
      if (num && Array.isArray(res) && res.length === 1) {
        matches.push({
          num,
          result: res[0]
        })
      }
    }
  })
  matches.forEach((match) => {
    var name = encuentros[`encuentro${match.num}`]
    if (Array.isArray(name)) {
      var [home, guest] = name[0].split('-').map((str) => str.trim())
      match.home = home
      match.guest = guest
    }
  })
  return matches.sort((a, b) => {
    return a.num - b.num
  })
}

const parseResult = (result) => {
  var date = services.dates.parseDate(result.$.fecha)
  return {
    result: {
      date,
      matches: result.encuentros ? parseCombinationQuiniela(result) : null,
      combination: result.encuentros ? null : parseCombination(result.combinacion[0]),
      escrutado: result.escrutado ? result.escrutado[0] === '1' : null,
      prizes: result.premios[0].premio.map((item) => {
        return {
          amount: parseFloat(item._.replace(/\./g, '').replace(/,/g, '.')),
          category: parseInt(item.$.categoria),
          description: item.$.descripcion
        }
      }).filter((item) => item.description !== 'millon' && item.description !== 'lluvia')
    }
  }
}

var gameDays = {
  loteria: [4, 6],
  primitiva: [4, 6],
  bonoloto: [1, 2, 3, 4, 5, 6],
  gordo: [7],
  euromillones: [2, 5],
  quiniela: [3, 4, 5]
}

class ResultsController {
  static prev (params) {
    var game = params.game
    var date = services.dates.parseDate(params.date)
    var dates = (gameDays[game] || []).map((day) => services.dates.prev(day, date))
    var maxDate = dates.reduce((max, date) => !max || date > max ? date : max)
    if (!maxDate) return {}
    return ResultsController.find(game, maxDate)
  }

  static next (params) {
    var game = params.game
    var date = services.dates.parseDate(params.date)
    var dates = (gameDays[game] || []).map((day) => services.dates.next(day, date))
    var minDate = dates.reduce((min, date) => !min || date < min ? date : min)
    if (!minDate) return {}
    return ResultsController.find(game, minDate)
  }

  static async find (game, date) {
    if (typeof date === 'string') date = services.dates.parseDate(date)
    var d = moment(date).format('DD/MM/YY')
    if (game === 'gordo') game = 'primitiva_g'
    if (game === 'primitiva') {
      var day = moment(date).day()
      if (day === 6) game = 'primitiva_s'
      else if (day === 4) game = 'primitiva_j'
    }
    const result = await services.gadmin('ConsultaResultados', `<Query><resultado><juego>${game}</juego><fecha>${d}</fecha></resultado></Query>`)
    var resultado = result.resultado && result.resultado[0]
    if (resultado.status && resultado.status[0] === 'KO') return {}
    return resultado && parseResult(resultado)
  }

  static all (params) {
    var games = {}
    return services.gadmin('ConsultaResultados', '<Query></Query>').then((results) => {
      results.resultado.forEach((result) => {
        var game = parseGame(result)
        if (!game) return
        games[game] = parseResult(result)
        if (game === 'loteria') {
          var res = games[game]
          var combination = res.result.combination
          var primero = combination.primero || '-'
          var additional = primero.substring(primero.length - 1)
          combination.reintegros = `${additional},${combination.reintegros}`
        }
      })
    })
      .then(() => {
        return services.gadmin('ConsultaFechaProximoSorteo', '<Query></Query>').then((results) => {
          results.sorteo.forEach((sorteo) => {
            var game = parseGame(sorteo, true)
            if (!game) return
            if (game === 'quiniela') {
              var matches = sorteo.matches = []
              if (sorteo.fecha && sorteo.fecha.length > 0) {
                Object.keys(sorteo.fecha[0]).forEach((key) => {
                  if (key.startsWith('partido')) {
                    var num = +key.substring('partido'.length)
                    var res = sorteo.fecha[0][key]
                    if (num && Array.isArray(res) && res.length === 1) {
                      var [home, guest] = res[0].split('-')
                      matches.push({
                        num,
                        home: decode(home).trim(),
                        guest: decode(guest).trim()
                      })
                    }
                  }
                })
              }
            }
            var info = games[game] = games[game] || {}
            if (sorteo.fecha) {
              sorteo.dates = parseDates(game, sorteo.fecha).sort((a, b) => a.date - b.date)
              sorteo.dates.forEach((date) => {
                if (date.type === 'cierre') {
                }
              })
              delete sorteo.fecha
            } else {
              sorteo.dates = []
            }
            if (sorteo.precioApuesta) {
              sorteo.price = +sorteo.precioApuesta[0] * 100
              delete sorteo.precioApuesta
            }
            delete sorteo.$
            info.sorteo = sorteo
          })
          /*
           const thursday = services.dates.next(4).hours(21).minute(0).second(0).millisecond(0).toDate()
           const saturday = services.dates.next(6).hours(13).minute(0).second(0).millisecond(0).toDate()
           games['loteria'].sorteo = {
           dates: [
           {
           type: 'jueves',
           date: thursday
           },
           {
           type: 'sabado',
           date: thursday
           },
           {
           type: 'cierre',
           date: thursday < saturday ? thursday : saturday
           }
           ]
           }
           */
        })
      })
      .then(() => {
        return services.gadmin('ConsultaBotes', '<Query></Query>').then((botes) => {
          botes.bote.forEach((bote) => {
            var game = parseGame(bote)
            if (!game) return
            var info = games[game] = games[game] || {}
            var amount = +bote.importe[0]
            if (amount) {
              info.bote = {
                amount,
                date: services.dates.parseDate(bote.fecha[0])
              }
            } else if (game === 'bonoloto') {
              info.bote = {
                amount: amount === 0 ? 'Sin Bote' : amount
              }
            }
          })
        })
      })
      .then(() => {
        return services.gadmin('ConsultaDecimos', '<Query></Query>')
          .then((result) => {
            const first = (obj, key) => (obj && Array.isArray(obj[key]) && obj[key][0]) || null
            return (result.sorteo || []).map((sorteo) => {
              var dates = []
              var date = first(sorteo, 'fecha')
              if (date) {
                dates.push({
                  type: '',
                  date: services.dates.parseDate(date)
                })
              }
              var cierre = first(sorteo, 'fechaCierre')
              if (cierre) {
                dates.push({
                  type: 'cierre',
                  date: services.dates.parseDate(cierre)
                })
                dates.push({
                  type: 'proximo',
                  date: services.dates.parseDate(cierre)
                })
              }
              var decimos = sorteo.decimos && sorteo.decimos[0] && sorteo.decimos[0].decimo
              decimos = Array.isArray(decimos) ? decimos : []
              var image = first(sorteo, 'imagen')
              return {
                id: sorteo.$.idSorteo,
                name: decode(first(sorteo, 'nombre') || ''),
                dates,
                price: +first(sorteo, 'precio') * 100,
                // numbers: +first(sorteo, 'numeros'),
                decimos: decimos.map((decimo) => {
                  return {
                    number: first(decimo, 'numero'),
                    stock: +first(decimo, 'stock')
                  }
                }),
                image: image && `http://panel.lotterapp.com/${image}`
              }
            })
          })
      })
      .then((loteria) => {
        var lot = games['loteria']
        var navidad = null
        delete games['loteria']
        loteria = loteria.map((item) => {
          var obj = Object.assign({}, lot, {type: 'loteria', sorteo: item, name: item.name})
          var cierre = item.dates.reduce((total, date) => date, null)
          cierre = cierre && cierre.date
          obj.special = obj.name.split(' ')[0].length > 1
          if (obj.name === 'NAVIDAD 2017') {
            obj.bote = {
              amount: 2240000000,
              date: cierre
            }
            navidad = obj
          } else {
            obj.bote = {
              amount: moment(cierre).isoWeekday() === 4 ? 12600000 : 42000000,
              date: cierre
            }
          }
          return obj
        })
        var result = Object.keys(games).map((key) => {
          var value = games[key]
          value.type = key
          return value
        })
        result = loteria.filter((obj) => obj.special)
          .concat(result)
          .concat(loteria.filter((obj) => !obj.special))
        return Promise.resolve()
          .then(() => {
            if (!navidad) return
            return ResultsController.find('loteria', '22/12/2015')
              .then((result) => {
                if (result) navidad.result = result.result
              })
          })
          .then(() => {
            var resultToReturn = []
            for (var i in result) {
              if (result[i].sorteo.dates && result[i].sorteo.dates.length > 0) {
                resultToReturn.push(result[i])
              }
            }
            return {games: resultToReturn}
          })
      })
  }
}

module.exports = ResultsController
