const crypto = require('crypto');
const OTP = require('../models/newRegister').OTP


exports.generateOTP = () => Math.floor(1000 + Math.random() * 9000)


// Store OTP
exports.storeOTP = async (mobileNumber,otp) => {

    console.log("storeOtp");
    const{hashedOTP,salt} = hashOTP(otp)

    console.log(hashedOTP);
    // Expiration Time 5 minutes
    const expirationTime = Date.now() + 3 * 60 * 1000

    console.log(expirationTime);

    await OTP.updateOne(
        {
            mobileNumber
        },
        {
            $set: {
                hashedOTP,
                salt,
                expirationTime
            },
        },
        {
            upsert : true
        }
    )
    console.log('OTP Stored Successfully');
}

// Hash OTP
const hashOTP = (otp) => {
    console.log("Inside hashOTP");
    const salt = crypto.randomBytes(16).toString('hex')
    console.log(salt);
    const hashedOTP = crypto.pbkdf2Sync(otp.toString(), salt, 1000, 64, 'sha256').toString('hex');
    console.log(hashedOTP);
    return {hashedOTP,salt}
}


// verify hash otp
const verifyHashedOTP = (otp,storedHashedOTP,storedSalt) => {
    console.log("Verfiy Hash");
    const hashEnteredOTP = crypto.pbkdf2Sync(otp.toString(), storedSalt, 1000, 64, 'sha256').toString('hex');
    console.log(hashEnteredOTP);
    return hashEnteredOTP === storedHashedOTP
}


// Verify OTP
exports.verifyOTP = async(mobileNumber,otp) => {

    console.log("verify inside");
    console.log(mobileNumber);
    const storedOTP = await OTP.findOne({mobileNumber})
    console.log(storedOTP);

    if(!storedOTP) return { isValid: false, message: "OTP Expired" };

    const isValid = verifyHashedOTP(otp,storedOTP.hashedOTP,storedOTP.salt)
    console.log(isValid);
    return { isValid, message: isValid ? "OTP Verified" : "Invalid OTP" };
}
