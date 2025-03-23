const jwt = require("jsonwebtoken")

exports.verifyToken = (req,res,next) => {
    const token = req.headers['authorization']

    console.log("Inside middleware");

    console.log(token);

    if(!token) return res.status(400).json("Please Provide Token")

    try {

        console.log("Inside decoded");
        const actualToken = token.split(" ")[1];
        console.log("Actual token :",actualToken);

        const decoded = jwt.verify(actualToken,process.env.JWT_SECRET)
        console.log("end decoded");
        console.log(decoded);
        console.log(decoded.isAdmin ? true : false);
        
        if (decoded.isAdmin) {
            req.admin = decoded.admin
        } else {
            req.userId = decoded.userId
        }

        next()

    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
    }
}

