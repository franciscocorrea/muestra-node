var models = require('../models')
var controllers = require('../controllers')

module.exports = (lindy) => {
  var chat = lindy.router('/api/chat')

  chat.post('/write', 'Writes in a group chat')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
      validate.string('text', 'The message written by the user').trim().notEmpty()
    })
    .run((params) => controllers.chat.write(params))

  chat.get('/messages', 'Lists the messages in a group chat')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.chat.messages(params))

  chat.get('/conversations', 'Lists the latest conversations')
    .middleware('auth')
    .run((params) => controllers.chat.conversations(params))

  chat.get('/members', 'Lists the members of a conversation')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.chat.members(params))
}
