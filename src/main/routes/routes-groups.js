var controllers = require('../controllers')
var models = require('../models')

module.exports = (lindy) => {
  var groups = lindy.router('/api/groups')

  groups.post('/create', 'Creates a group')
    .middleware('auth')
    .middleware('upload')
    .params((validate) => {
      validate.string('name', 'Name of the group').trim().notEmpty()
      validate.string('game', 'Name of the game to play').trim().notEmpty()
      validate.string('invitationNames', 'Names array of recipients to invite').array().optional()
      validate.string('invitationEmails', 'Emails array of recipients to invite').array().optional()
      validate.string('invitationMobiles', 'Mobile phones array of recipients to invite').array().optional()
      validate.string('phones', 'List of email phones send SMS to').array().optional()
      validate.string('private', 'Weather this group is public or not').optional()
      validate.number('share', 'The amount of money that the admin will put in the credit')
    })
    .run((params) => controllers.groups.create(params))

  groups.get('/list', 'Lists the available public groups')
    .middleware('auth', { optional: true })
    .run((params) => controllers.groups.list(params))

  groups.get('/show', 'Gets the information of a group')
    .middleware('auth', { optional: true })
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.groups.show(params))

  groups.post('/update', 'Updates a group')
    .middleware('auth')
    .middleware('upload')
    .params((validate) => {
      validate.string('name', 'New name of the group').trim().notEmpty()
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.groups.update(params))

  groups.post('/join', 'Joins a group')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
      validate.string('code').optional()
    })
    .run((params) => controllers.groups.join(params))

  groups.post('/skip', 'Removes any invitation to this group')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.groups.skip(params))

  groups.get('/joined', 'Joins a group')
    .middleware('auth')
    .run((params) => controllers.groups.joined(params))

  groups.post('/leave', 'Leaves a group')
    .middleware('auth')
    .params((validate) => {
      validate.entity('group').model(models.groups)
    })
    .run((params) => controllers.groups.leave(params))
}
