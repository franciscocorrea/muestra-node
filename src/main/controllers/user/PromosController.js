'use strict'

const rejects = require('lindyhop').rejects
const UserCredit = require('../../services/money').UserCredit
const Promo = require('../../models').promos
const PromoUser = require('../../models').promoUser
const IncompatiblePromos = require('../../models').incompatiblePromos
const ErrorHandler = require('../../exceptions/handler')
const Transaction = require('../../services/money').Transaction

class PromosController {
    /**
     * Activate a promo
     *
     * @param {*} params
     */
  static async store (params) {
    const user = params.user
    const promo = await Promo.selectOne({code: params.code})
    if (!promo) return rejects.badRequest('El código de promocion no es correcto, por favor verifica el código e intenta de nuevo')
    const userActivePromos = await PromoUser.selectAll({userId: user.id})
    const incompatiblePromos = await IncompatiblePromos.selectAll({promoId: promo.id})
    if (promo.activeFrom > new Date() || promo.activeTo < new Date()) {
      return rejects.badRequest('Esta promoción no esta activa en este momento')
    }
    try {
      if (userActivePromos) {
        for (let userPromoKey = 0; userPromoKey < userActivePromos.length; userPromoKey++) {
          const activePromo = userActivePromos[userPromoKey]
          if (activePromo.promoId === promo.id) return rejects.badRequest('Ya has hecho uso de esta promoción')
          for (let incompatibleKey = 0; incompatibleKey < incompatiblePromos.length; incompatibleKey++) {
            const incompatiblePromo = incompatiblePromos[incompatibleKey]
            if (activePromo.id === incompatiblePromo.id) return rejects.badRequest('Ya has hecho uso de una promoción incompatible con esta, por lo cual esta promocíon no puede ser activada')
          }
        }
      }
      PromoUser.insert({userId: user.id, promoId: promo.id, activatedAt: new Date()})
      const creditService = new UserCredit(user)
      const transaction = await creditService.add(promo.amount)
      if (transaction.success) {
        await Transaction.fromUser(promo.amount, 'promo', 'Uso de código de promosion', user)
      }
      return {success: true, message: 'La promosión ha sido procesada con éxito'}
    } catch (error) {
      ErrorHandler.report(error, 'Promos controller: store')
      return rejects.badRequest(error.message)
    }
  }
}

module.exports = PromosController
