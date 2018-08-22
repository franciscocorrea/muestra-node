var lindyhop = require('lindyhop')

class EntityValidator extends lindyhop.AbstractValidator {
  // custom method
  model (clazz, pk = 'id') {
    this.clazz = clazz
    this.pk = pk
    return this
  }

  // mandatory method
  validate (value) {
    return this.clazz.selectOne({ [this.pk]: value })
      .then((obj) => {
        if (!obj && !this.isOptional) {
          return this.validationError(`Object of class ${this.clazz.name} with id '${value}' not found`)
        }
        return obj
      })
  }
}

// register the validator
lindyhop.validator('entity', EntityValidator)
