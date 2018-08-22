const app = require('./app')
const lindyhop = require('lindyhop')

const lindy = lindyhop.hop(app, {
  'title': 'LotterApp',
  'description': 'Lotter app Api docs for version 2.0.0',
  'contact': {
    'name': 'Next Dots',
    'url': '',
    'email': ''
  },
  'license': {
    'name': 'Copyright',
    'url': ''
  },
  'version': '2.0.0'
})

module.exports = lindy
