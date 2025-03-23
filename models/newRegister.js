const mongoose = require('mongoose')
const validator = require('validator')

const attendancePianoSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'newRegister',
        required:true
    },
    course:{
        type:String,
        default:"Piano",
        required:true
    },
    attendance:[{
        month:{
            type:String,
            required:true
        },
        year:{
            type:Number,
            required:true
        },
        weeks:[{
            week:{
                type:Number,
                required:true
            },
            status:{
                type:Boolean,
                default:false
            }
        }]  
    }]
})


const attendanceVocalSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'newRegister',
        required:true
    },
    course:{
        type:String,
        default:"Western Vocals",
        required:true
    },
    attendance:[{
        month:{
            type:String,
            required:true
        },
        year:{
            type:Number,
            required:true
        },
        weeks:[{
            week:{
                type:Number,
                required:true
            },
            status:{
                type:Boolean,
                default:false
            }
        }]  
    }]
})


const feesPianoSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"newRegister",
        required:true
    },
    course:{
        type:String,
        default:"Piano",
        required:true
    },
    fees:[{
        month:{
            type:String,
            required:true
        },
        year:{
            type:Number,
            required:true
        },
        status:{
            type:Boolean,
            required:true,
            default:false
        },
        transactionId:{
            type:String,
            required:true
        },
        invoice:{
            type:String,
            required:true
        }
    }]    
})


const feesVocalSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"newRegister",
        required:true
    },
    course:{
        type:String,
        default:"Western Vocals",
        required:true
    },
    fees:[{
        month:{
            type:String,
            required:true
        },
        year:{
            type:Number,
            required:true
        },
        status:{
            type:Boolean,
            required:true,
            default:false
        },
        transactionId:{
            type:String,
            required:true
        },
        invoice:{
            type:String,
            required:true
        }
    }]    
})


const newRegisterSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        validator(value){
            if(!validator.isEmail(value)){
                throw Error("Invalid Email")
            }
        }
    },
    phone:{
        type:String,
        required:true,
        unique:true, 
        minlength:10,
        maxlength:10
    },
    courses:[{
        courseName:{
            type:String,
            required:true
        },
        status: {
            type: Boolean,
            required:true,
            default: true
        },
        meetingLink:{
            type:String,
            default:"Yet to Update"
        },
        whatsappGroup:{
            type:String,
            default:"Yet to Update"
        },
        grade:{
            type:String,
            default:"Yet to Update"
        },
        batch:{
            type:String,
            default:"Yet to Update"
        },
    }],
    studentID:{
        type:String,
        required:true,
        unique:true
    },
})


const otpSchema = mongoose.Schema({
    mobileNumber : {
        type : Number,
        required : true,
        unique : true
    },
    hashedOTP : {
        type : String,
        required : true
    },
    salt : {
        type : String,
        required : true
    },
    expirationTime : {
        type : Date,
        required : true,
        index : { expires : '2m' }
    },
    
},{
    timestamps : true
})

const adminLoginSchema  = mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    }
})

const attendancePiano = mongoose.model("attendance piano",attendancePianoSchema)
const attendanceVocal = mongoose.model("attendance vocal",attendanceVocalSchema)
const feesPiano = mongoose.model('fees piano',feesPianoSchema)
const feesVocal = mongoose.model('fees vocal',feesVocalSchema)
const students = mongoose.model('newRegister',newRegisterSchema)
const OTP = mongoose.model('OTP',otpSchema)
const adminLogin = mongoose.model('Admin Login',adminLoginSchema)

module.exports = {students,attendancePiano,attendanceVocal,feesPiano,feesVocal,OTP,adminLogin}