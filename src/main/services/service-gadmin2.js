var parseXMLString = require('xml2js').parseString
var pify = require('pify')
var request = pify(require('request'), { multiArgs: true })
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects

const parseXML = (buff) => {
  return new Promise((resolve, reject) => {
    parseXMLString(buff, (err, res) => {
      err ? reject(err) : resolve(res)
    })
  })
}

exports.search = (number, date) => {
  number = number.replace(/\*/g, '0')
  number = ('00000' + number)
  number = number.substring(number.length - 5)
  const req = {
    url: 'http://gadmin.es/webservice/index.php',
    qs: {
      idAccion: 'search_number_query',
      numero: number,
      fecha: date
    }
  }
  return request(req)
    .then(([res, body]) => parseXML(body))
    .then((result) => {
      result = (result && result.result) || {}
      const found = result.items && result.items[0].item
      const arr = found || (result.similares && result.similares[0].item)
      let results = []
      if (Array.isArray(arr)) {
        results = arr.map((item) => ({
          number: (item.numero && item.numero[0]) || number,
          client: item.cliente[0].replace(/https?:\/\//g, ''),
          stock: +item.cantidad[0],
          sorteo: item.idSorteo[0]
        }))
        .filter((item) => +item.number >= 100)
      }
      return { found: !!found && results.length > 0, results }
    })
}

exports.buy = (info) => {
  const { client, sorteo, count, date } = info
  let { number } = info
  number = ('00000' + number)
  number = number.substring(number.length - 5)
  const req = {
    url: 'http://gadmin.es/webservice/lotterapp.php',
    qs: {
      cliente: client,
      idSorteo: sorteo,
      cantidad: count,
      numero: number,
      fecha: date
    }
  }
  return request(req)
    .then(([res, body]) => {
      if (body !== 'OK') return rejects.internalError(`Error de GAdmin: ${body}`)
      return { id: [0] } // TODO: id
    })
}

if (module.id === require.main.id) {
  const testBuy = () => {
    return exports.buy({
      client: 'http://www.panel.lotterapp.com',
      sorteo: '4',
      count: '1',
      number: '76548',
      date: '22/12/2016'
    })
  }
  testBuy().then((result) => {
    console.log('result', JSON.stringify(result, null, 2))
  })
  .catch((err) => {
    console.log('err', err.stack)
  })
}
