'use strict'

const Promos = require('../../controllers/user').Promos

module.exports = (lindy) => {
  const promos = lindy.router('/api/users/promos')

  promos.post('/', 'activate a promo')
  .middleware('auth')
  .params((validate) => {
    validate.string('code', 'code to activate the promo')
  })
    .run((params) => Promos.store(params))
}
