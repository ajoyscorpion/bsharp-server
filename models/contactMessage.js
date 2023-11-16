const mongoose = require("mongoose")
const validator = require("validator")

const contactMessageSchema = mongoose.Schema({
    senderName:{
        type:String,
        required:true
    },
    senderEmail:{
        type:String,
        required:true,
        validator(value){
            if(!validator.isEmail(value)){
                throw Error("Invalid Email")
            }
        }
    },
    message:{
        type:String,
        required:true
    }
})

const contactMessage = mongoose.model("contactMessage",contactMessageSchema)

module.exports = contactMessage 