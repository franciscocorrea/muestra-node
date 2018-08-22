const soap = require('soap')
const parseXMLString = require('xml2js').parseString
const moment = require('moment')
const iconv = require('iconv-lite')
const crypto = require('crypto')

const parseXML = (buff, callback) => {
  parseXMLString(buff, (err, res) => {
    if (err) {
      console.error('Error while parsing XML', buff.toString(), buff.toString('base64'))
    }
    callback(err, res)
  })
}

let apikey = 'lotterapp.com'
let url = 'http://panel.lotterapp.com/servicioweb/gadmin/servicio.php?wsdl'
let keys = {
  '1': 'dc631b5fc97cc687725e5e07c04ef679726aacc5e8f511af',
  '2': '61772312a59479090b0ab8afb6087d5a1edefdf10cc81e5a',
  '3': 'c411258fc546b9cbb9d3ca4d8d537b130c763208b14155bb',
  '4': '4b4f8032e9d3b9e008644b618c0d0d40870097138c896bae',
  '5': 'dd61cf030a32876b3d5d60b6639ba9ebb3a8ea4a803fefcf',
  '6': 'fc5ee9f45c267de54ead91a4657cc47c77dfd4c7aacac9f5',
  '7': 'b8354906f90d43ae8644369ebc5dca06bf998c06f811b543',
  '8': '8b7439444c7ffa21c3f6cbf2725acdb361577f9509ad2ffa',
  '9': 'a0bfa31b5fc46c07aebac6fb1647aa751d13cedb7d2ca86d',
  '10': '318a8bdf8ed45cbd5ab25a5366564272f7089aebe7ce4a8e'
}

let client = null

function setup () {
  return new Promise((resolve, reject) => {
    if (client) return resolve()
    soap.createClient(url, (err, cl) => {
      if (err) {
        console.warn('ha habido un error al crear el cliente')
        return reject(err)
      }
      client = cl
      resolve()
    })
  })
}

const makeRequest = (method, query, sessionId = 1) => {
  query = query.replace(/>\s+</g, '><').trim()
  let date = moment().format('DD/MM/YY HH:mm:ss')
  let now = Date.now()
  let keyId = String(1 + Math.floor(Math.random() * (Object.keys(keys).length)))
  let key = keys[keyId]
  let content = Buffer.from(iconv.encode('<?xml version="1.0" encoding="ISO-8859-1"?>' + query, 'ISO-8859-1'))
        .toString('hex')
  let signature = crypto.createHash('sha1').update(date + now + key).digest('hex')
  let xml = `<?xml version="1.0" encoding="ISO-8859-1"?><message><operation tr="${sessionId}" id="${now}" key="${keyId}" date="${date}" apikey="${apikey}"><content>${content}</content></operation><signature>${signature}</signature></message>`
  let tramaSoap = Buffer.from(xml).toString('base64')
  return setup()
    .then(() => {
      return new Promise((resolve, reject) => {
        client[method].call(this, { tramaSoap }, (err, firstResult, raw) => {
          if (err) {
            requestErrorNotificator(err)
            return reject(err)
          }
          let res = firstResult[Object.keys(firstResult)[0]]['$value']
          parseXML(Buffer.from(res, 'base64'), (err, result) => {
            if (err) {
              return console.log('result', firstResult, keyId) || reject(err)
            }
            let hex = Buffer.from(result.message.operation[0].content[0], 'hex')
            let res = iconv.decode(hex, 'ISO-8859-1')
            parseXML(res, (err, res) => {
              if (err) {
                return console.log('hex', result.message.operation[0].content[0], keyId) || reject(err)
              }
              resolve(res.acknowledge)
            })
          })
        })
      })
    })
}

const requestErrorNotificator = (err) => {
  console.warn(err.stack)
}

const getGameName = (game) => {
  const games = {
    gordo: 'gordo_primitiva',
    loteria: 'lottery'
  }

  return games[game] ? games[game] : game
}

exports.login = () => {
  console.log('[service gadminApi] starting session in gadmin api')
  let query = `<Query></Query>`
  return makeRequest('sessionStart', query).then(async(res) => {
    query = `<Query>
        <pass>${encodeURI(process.env.GADMIN_PASS)}</pass>
        <user>${encodeURI(process.env.GADMIN_USER)}</user>
        </Query>`
    await makeRequest('login', query, res.sessionID[0])

    return res.sessionID[0]
  })
}

/**
 * look for a purchased order
 */
exports.findOrder = async (order, sessionId) => {
  console.log(`[service gadminApi] finding order: ${order} on gadmin api`)
  const query = `<Query><idPedido>${order}</idPedido></Query>`
  const response = await makeRequest('ConsultaDatosPedido', query, sessionId)

  return response
}

/**
 * validates a bet
 */
exports.validateBet = (bedExternalId) => {
  console.log(`[service gadminApi] validating bet: ${bedExternalId} on gadmin api`)
  const query = `<Query><pedido>${bedExternalId}</pedido></Query>`
  return makeRequest('ConsultaValidaciones', query)
    .then((res) => {
      return res
    })
}

/**
 * gets te jackpots for the date and game(s) given
 */
exports.getJackpots = async (game = 'all', date = null) => {
  const query = game && date
    ? `<Query><juego>${game}</juego></Query>`
    : `<Query><juego>${game}</juego><fecha>${encodeURI(date)}</fecha></Query>`
  const response = await makeRequest('ConsultaBotes', query)
  return response
}

/**
 * buys the commom order for any bet except lotery bets
 */
exports.buyOrder = async (bet) => {
  const query = bet.game === 'loteria'
  ? `<Query>
      <pass>${encodeURI(process.env.GADMIN_PASS)}</pass>
      <user>${encodeURI(process.env.GADMIN_USER)}</user>
      <enviaremail>no</enviaremail>
      <items>
        <item>
          <cantidadDet>1</cantidadDet>
          <descripcionDet>nodeff</descripcionDet>
          <fechaSorteo>${encodeURI(bet.date)}</fechaSorteo>
          <idReferencia>${getGameName(bet.game)}</idReferencia>
          <precioDet>${(bet.amount / 100).toFixed(2)}</precioDet>
          <decimos>
            <decimo>
              <numero>${bet.thenth}</numero>
              <cantidad>${bet.quantity}</cantidad>
            </decimo>
          </decimos>
        </item>
      </items>
    </Query>`
  : `<Query>
    <pass>${encodeURI(process.env.GADMIN_PASS)}</pass>
    <user>${encodeURI(process.env.GADMIN_USER)}</user>
    <enviaremail>no</enviaremail>
    <items>
      <item>
        <cantidadDet>${bet.quantity}</cantidadDet>
        <descripcionDet>${encodeURIComponent(bet.combinations)}</descripcionDet>
        <fechaSorteo>${encodeURI(bet.date)}</fechaSorteo>
        <idReferencia>${getGameName(bet.game)}</idReferencia>
        <precioDet>${(bet.amount / 100).toFixed(2)}</precioDet>
      </item>
    </items>
  </Query>`
  const response = await makeRequest('addAndPay', query)

  return response
}
