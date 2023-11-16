const contactMessage = require('../models/contactMessage')

exports.contactmessage = async(req,res)=>{
    console.log("Contact Message");
    console.log(req.body);
    const {senderName,senderEmail,message} = req.body
    if(!senderName || !senderEmail || !message){
        res.status(403).json("All inputs are required")
    }
    try{
        const newMessage = new contactMessage({
            senderName,
            senderEmail,
            message
        })
        await newMessage.save()
        res.status(200).json(newMessage)
    }
    catch(error){
    res.status(401).json(error)
    }    
}