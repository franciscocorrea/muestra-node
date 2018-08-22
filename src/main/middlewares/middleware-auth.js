const lindyhop = require('lindyhop')
const rejects = lindyhop.rejects
const models = require('../models')
const db = models.seaquel

lindyhop.middleware('auth', (req, res, options = {}, params) => {
  let session = req.query.session || req.body.session
  const forbidden = () => rejects.forbidden({
    error: 'InvalidSession',
    message: `Session not found for token '${session || ''}'`
  })
  if (!session && options.optional) return
  if (!session) return forbidden()
  let sql = `
    SELECT
      ${models.sessions.columns('s')},
      ${models.users.columns('u')}
    FROM sessions s
    JOIN users u ON s."userId" = u.id
    WHERE token=$1
  `
  return db.queryOne(sql, [session])
    .then((session) => {
      if (!session && options.optional) return
      if (!session) return forbidden()
      params.user = db.pick(session, 'u')
      params.session = db.pick(session, 's')
    })
})
