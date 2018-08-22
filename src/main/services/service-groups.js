var models = require('../models')
var services = require('../services')
var db = models.seaquel
var lindyhop = require('lindyhop')
var rejects = lindyhop.rejects

exports.updateFields = async (group) => {
  await db.execute(`
    UPDATE groups SET "membersCount"=(
      SELECT COUNT(*) FROM memberships WHERE "groupId"=$1
    )
    WHERE id=$1
  `, [group.id])
  await db.execute(`
    UPDATE groups SET share=(CASE WHEN "membersCount"=0 THEN 0 ELSE (credit / "membersCount") END)
    WHERE id=$1
  `, [group.id])
  const info = await models.groups.selectOne({ id: group.id })
  await db.execute(`
    UPDATE memberships SET share=($2 / (
      SELECT COUNT(*) FROM memberships WHERE "groupId"=$1 AND "pendingPayments"=0
    )) WHERE "groupId"=$1 AND "pendingPayments"=0
  `, [group.id, info.credit])
}

exports.startCampaign = async (group, share, user, limitDate) => {
  group.shareInitial = share
  group.latestCampaign = new Date()
  const memberships = await models.memberships.selectAll({
    groupId: group.id
  })
  for (const membership of memberships) {
    const member = await models.users.selectOne({ id: membership.userId })
    var description = `Reparto particip. Peña ${group.name}`
    var descriptionGroup = `Reparto particip. de ${member.firstName || ''} ${member.lastName || ''}`.trim()
    var amount = -membership.share
    if (membership.share > 0) {
      await services.credit.creditUser(member, 'group', amount, group, description, descriptionGroup)
    }
  }
  await models.groups.update({
    id: group.id,
    shareInitial: group.shareInitial,
    latestCampaign: group.latestCampaign
  })
  await models.memberships.updateWhere({
    pendingPayments: 1,
    paymentLimit: limitDate
  }, { groupId: group.id })
  if (user) {
    const description = `Aportación Peña ${group.name}`
    await services.credit.creditUser(user, 'group', share, group, description)
  }
}

exports.leave = async (user, group) => {
  return models.memberships.selectOne({
    userId: user.id,
    groupId: group.id
  })
  .then((membership) => {
    if (!membership) return rejects.notFound('No perteneces ya a esta Peña')
    if (membership.level === 'admin') {
      console.log(`un usuario administrador intenta dejar la peña ${user.id}`)
      return
    }
    var description = `Abandono Peña ${group.name}`
    var descriptionGroup = `Abandono de ${user.firstName || ''} ${user.lastName || ''}`.trim()
    var amount = -membership.share
    return services.credit.creditUser(user, 'group', amount, group, description, descriptionGroup)
      .then(() => models.memberships.delete(membership))
  })
  .then(() => services.groups.updateFields(group))
  .then(() => ({}))
}
