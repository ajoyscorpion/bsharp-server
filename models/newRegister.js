const mongoose = require('mongoose')
const validator = require('validator')

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
        minlength:10,
        maxlength:10
    },
    courses:{
        type:Array,
        required:true
    }
})

const newRegister = mongoose.model('newRegister',newRegisterSchema)

module.exports = newRegister