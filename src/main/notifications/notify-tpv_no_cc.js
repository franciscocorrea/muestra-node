const services = require('../services')
const dedent = require('dedent')

const mailTemplate = (user, data) => {
  return dedent`
    <p>Hola ${user.firstName} ${user.lastName},</p>
    <p>Hemos verificado que tu tarjeta no se encuentra almacenada y 
    por lo tanto no hemos podido realizar el siguiente cobro:</p>
    <p>${data.amount / 100}€ en concepto de ${data.name}.</p>
    <p>Para poder seguir jugando tienes que entrar en LotterApp y cargar crédito en tu cuenta. 
    Una vez hayas cargado crédito tu tarjeta quedará almacenada para las siguientes compras.</p>
    <p>Recuerda que tienes plazo hasta el ${data.date.format('D')} 
        de ${data.date.format('MMMM')} a las ${data.date.format('HH:mm')} 
        para cargar crédito, en caso contrario tu ${data.betType} no será renovada.</p>
    <p>Para cualquier duda o consulta puedes escribirnos a hola@lotterapp.com</p>
    <p>Saludos!</p>
    <p>El Equipo de LotterApp</p>`
}

const mail = (user, data) => {
  services.email.sendMail({
    to: user.email,
    subject: 'Aviso de fallo al momento de realizarle el cobro',
    html: mailTemplate(user, data)
  })
}

exports.notify = (user, data = {}) => {
  mail(user, data)
}
