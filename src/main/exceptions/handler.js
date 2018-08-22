const services = require('../services')

exports.developmentErrors = (err, req, res, next) => {
  err.stack = err.stack || ''
  const errorDetails = {
    message: err.message,
    status: err.status,
    stackHighlighted: err.stack.replace(/[a-z_-\d]+.js:\d+:\d+/gi, '<mark>$&</mark>')
  }
  this.report(err)
  res.status(err.status || 500)
  res.format({
    'text/html': () => {
      res.render('error', errorDetails)
    },
    'application/json': () => res.json(errorDetails)
  })
}

exports.productionErrors = (err, req, res, next) => {
  res.status(err.status || 500)
  this.report(err)
  res.render('error', {
    message: err.message,
    error: {}
  })
}

exports.report = (err, task = '') => {
  const codeTag = '```'
  console.error(`Task: [${task}] \n Whoops looks like something when wrong!: \n message: ${err.message} \n code: ${err.status} \n stack: ${err.stack}`)
  services.slack(`Task: [${task}] \n Whoops looks like something when wrong!: \n ${codeTag} message: ${err.message} \n code: ${err.status} \n stack: ${err.stack} ${codeTag}`, process.env.SLACK_LOG_WEBHOOK)
}
