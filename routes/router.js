const express = require('express')
const newRegistrationController = require('../controller/newRegistrationController')
const contactMessageController = require('../controller/contactMessageController')

const router = new express.Router()

router.post('/register',newRegistrationController.register)

router.post('/contact',contactMessageController.contactmessage)

module.exports = router