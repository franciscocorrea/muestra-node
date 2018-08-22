const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects
const basicAuth = require('basic-auth')

lindyhop.middleware('admin-auth', (req, res, options = {}, params) => {
  function unauthorized () {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
    res.status(401)
    return rejects.unauthorized({
      error: 'AuthorizationRequired',
      message: 'Authorization Required'
    })
  }

  let user = basicAuth(req)
  if (!user || user.name !== 'lotter' || user.pass !== 'app') return unauthorized()
})
