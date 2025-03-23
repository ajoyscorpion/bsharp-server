const express = require('express')
const newRegistrationController = require('../controller/newRegistrationController')
const contactMessageController = require('../controller/contactMessageController')
const attendanceController = require("../controller/AttendanceController")
const feesController = require("../controller/FeesController")
const middleWare = require("../middleware/tokenVerification")

const router = new express.Router()

// Client Side

// New Registraion Controller 
router.post('/register',newRegistrationController.register)

router.post('/login',newRegistrationController.login)

router.post('/sendOTP',newRegistrationController.sendOTP)

router.post('/login',newRegistrationController.login)


// Fees Controller
router.post("/payFees/:studentID",middleWare.verifyToken,feesController.payFees)

router.get('/invoice/:studentID',middleWare.verifyToken,feesController.getPdf)

router.get('/createOrder',middleWare.verifyToken,feesController.createOrder)

// Contact Message Controller
router.post('/contact',contactMessageController.contactmessage)




// Server Side

// New Registraion Controller 
router.post('/loginAdmin',newRegistrationController.loginAdmin)

router.delete('/delete',middleWare.verifyToken,newRegistrationController.delete)

router.put("/updateStudent",newRegistrationController.updateStudent)

router.get("/studentDetails/:studentID",middleWare.verifyToken,newRegistrationController.studentDetails)

router.get("/allStudents",newRegistrationController.allStudents)

router.post('/addCourse',newRegistrationController.addCourse)

// Attendance Controller
router.put("/updateAttendance",middleWare.verifyToken,attendanceController.updateAttendance)

router.post("/discontinue",attendanceController.discontinue)

router.post("/restart",attendanceController.restart)


module.exports = router