var lindyhop = require('lindyhop')

lindyhop.middleware('upload', (req, res, options, params) => {
  Object.keys(req.files || []).forEach((key) => {
    params[key] = req.files[key]
  })
})
