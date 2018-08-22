const path = require('path')
const express = require('express')
const bodyparser = require('body-parser')
const multer = require('multer')
const errorHandler = require('./exceptions/handler')
const enforce = require('express-sslify')

const app = express()
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }))
}
app.disable('x-powered-by')
app.set('views', './views')
app.set('view engine', 'pug')
app.use(express.static('public'))
app.use(express.static('static'))
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))

const upload = multer({
  dest: process.env.TEMP,
  limits: {fieldSize: 20 * 1024 * 1024}
})
app.use(upload.fields([{ name: 'image' }]))

/*******
 * Error Handler
 ************/
if (app.get('env') === 'development' || app.get('env') === 'staging') {
  app.use(errorHandler.developmentErrors)
}
app.use(errorHandler.productionErrors)

app.get('/docs', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../../api_docs/index.html'))
})

app.get('/status', (req, res, next) => {
  res.json({
    env: process.env.NODE_ENV
  })
})

/** Download files prensa **/
app.get(['/downloads/file/prensa', '/downloads/file/guias-estilos', '/downloads/file/nuestro-logo', '/downloads/file/pantallas', '/downloads/file/kit-prensa'], (req, res, next) => {
  const segments = req.path.split('/')
  let file
  switch (segments[3]) {
    case 'prensa':
      file = path.join(__dirname, '../../static/files/Notas-de-Prensa.zip')
      break
    case 'guias-estilos':
      file = path.join(__dirname, '../../static/files/Style-Guide.zip')
      break
    case 'nuestro-logo':
      file = path.join(__dirname, '../../static/files/Logo-icon.zip')
      break
    case 'pantallas':
      file = path.join(__dirname, '../../static/files/Pantallas.zip')
      break
    case 'kit-prensa':
      file = path.join(__dirname, '../../static/files/Press-Kit.zip')
      break
    default:
      return 'No Found file'
  }

  res.download(file)
})

module.exports = app
