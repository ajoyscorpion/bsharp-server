const newRegister = require('../models/newRegister')

exports.register = async(req,res)=>{
    console.log("register");
    console.log(req.body);
    const {name,email,phone,courses} = req.body
    if(!name || !email || !phone || !courses){
        res.status(403).json("All inputs are required")
    }
    try{
        const preuser = await newRegister.findOne({email})
        if(preuser){
            res.status(406).json("Already exist")
        }
        else{
            const newuser = new newRegister({
                name,
                email,
                phone,
                courses
            })
            await newuser.save()
            res.status(200).json(newuser)
        }
    }
    catch(error){
    res.status(401).json(error)
    }    
}



