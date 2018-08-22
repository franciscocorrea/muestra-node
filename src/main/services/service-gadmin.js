var soap = require('soap')
var parseXMLString = require('xml2js').parseString
var moment = require('moment')
var iconv = require('iconv-lite')
var crypto = require('crypto')
var services = require('./')

const parseXML = (buff, callback) => {
  parseXMLString(buff, (err, res) => {
    if (err) {
      console.error('Error while parsing XML', buff.toString(), buff.toString('base64'))
    }
    callback(err, res)
  })
}

var apikey = 'lotterapp.com'
var url = 'http://panel.lotterapp.com/servicioweb/gadmin/servicio.php?wsdl'
var keys = {
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

var client = null
function setup () {
  return new Promise((resolve, reject) => {
    if (client) return resolve()
    soap.createClient(url, (err, cl) => {
      if (err) return reject(err)
      client = cl
      resolve()
    })
  })
}

module.exports = (method, query) => {
  query = query.replace(/>\s+</g, '><').trim()
  return setup()
    .then(() => {
      return new Promise((resolve, reject) => {
        var date = moment().format('DD/MM/YY HH:mm:ss')
        var now = Date.now()
        var keyId = String(1 + Math.floor(Math.random() * (Object.keys(keys).length)))
        var key = keys[keyId]
        var content = Buffer.from(iconv.encode('<?xml version="1.0" encoding="ISO-8859-1"?>' + query, 'ISO-8859-1')).toString('hex')
        var signature = crypto.createHash('sha1').update(date + now + key).digest('hex')
        var xml = `<?xml version="1.0" encoding="ISO-8859-1"?><message><operation tr="1" id="${now}" key="${keyId}" date="${date}" apikey="${apikey}"><content>${content}</content></operation><signature>${signature}</signature></message>`
        var tramaSoap = Buffer.from(xml).toString('base64')
        client[method].call(this, { tramaSoap }, (err, firstResult, raw) => {
          if (err) {
            services.email.sendMail({
              to: 'soporte@lotterapp.com, franco.correa@nextdots.com',
              subject: '[LotterApp] Error en GAdmin',
              text: `
                Ha habido un error en la comunicación con GAdmin:

                ${err.stack}
              `
            })
            const quotes = '```'
            services.slack(`Ha habido un error en la comunicación con GAdmin (${process.env.NODE_ENV}): ${quotes}${err.stack}${quotes}`)

            return reject(err)
          }
          var res = firstResult[Object.keys(firstResult)[0]]['$value']
          parseXML(Buffer.from(res, 'base64'), (err, result) => {
            if (err) return console.log('result', firstResult, keyId) || reject(err)
            var hex = Buffer.from(result.message.operation[0].content[0], 'hex')
            var res = iconv.decode(hex, 'ISO-8859-1')
            parseXML(res, (err, res) => {
              if (err) return console.log('hex', result.message.operation[0].content[0], keyId) || reject(err)
              resolve(res.acknowledge)
            })
          })
        })
      })
    })
}
