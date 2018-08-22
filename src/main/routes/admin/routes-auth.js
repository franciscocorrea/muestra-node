const lindyhop = require('lindyhop')

lindyhop.middleware('admin', (req, res, options, params) => {
  params.path = req.baseUrl + req.path
})

module.exports = (lindy) => {
  const auth = lindy.router('/admin')

  auth.get('/', '')
    .middleware('admin-auth')
    .middleware('admin')
    .outputs('html', 'admin/index.pug')
    .run((params) => params)
}
