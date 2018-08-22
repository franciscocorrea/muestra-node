var lindyhop = require('lindyhop')

lindyhop.middleware('pagination', (req, res, options, params) => {
  params.offset = Math.max(+req.query.offset || 0, 0)
  params.limit = 100
})
