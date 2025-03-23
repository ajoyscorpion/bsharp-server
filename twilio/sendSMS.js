const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = 'YOUR_TWILIO_PHONE_NUMBER';

const client = new twilio(accountSid, authToken);

const sendMessage = (mobileNumber,message) => {
    client.messages
        .create({
            body: message, // Message text
            from: twilioPhoneNumber, // Your Twilio phone number
            to: `+91${mobileNumber}`, // Recipient's phone number
        })
        .then((message) => {
            console.log('Message sent successfully:', message.sid);
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

exports.sendVerificationCode = (mobileNumber,otp) => {
    const message = `Dear user, your verification code is: ${otp}. This code is valid for 2 minutes. Please do not share this code with anyone.`
    sendMessage(mobileNumber,message)
}

exports.sendRegistrationSMS = (mobileNumber,name) => {
    const message = `Hi ${name}, welcome to B# Music Conservatory! You have been successfully registered. We're glad to have you on board!`
    sendMessage(mobileNumber,message)
}

exports.sendFeesSMS = (mobileNumber,name) => {
    const message = `Hi ${name}, we have received your payment for the ${course} course for ${month} ${year}. Thank you for your timely payment and commitment to B# Music Conservatory!`
    sendMessage(mobileNumber,message)
}




