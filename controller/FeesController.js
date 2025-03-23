const { students } = require('../models/newRegister');
const feesPiano = require('../models/newRegister').feesPiano
const feesVocal = require('../models/newRegister').feesVocal
const moment = require('moment')
const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const Razorpay = require('razorpay');
const { feesSMS } = require('../twilio/sendSMS');

// AWS S3
const s3 = new AWS.S3({
    accessKeyId:process.env.AWS_ACCESSKEYID,
    secretAccessKey:process.env.AWS_SECRETACCESSKEY,
    region:process.env.AWS_REGION
})

// Razorpay
const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEYID,
    key_secret:process.env.RAZORPAY_KEYSECRET
})

// Upload invoice to s3
const uploadPDFToS3 = async(file,fileName) => {
    const params = {
        Bucket:process.env.AWS_BUCKET_NAME,
        Key:fileName,
        Body:file,
        ContentType:'application/pdf'
    }

    const data = await s3.upload(params).promise()
    return data.Location
}


// Create Invoice number
let lastInvoiceNumber = 1000
const createInvoiceNumber = () => lastInvoiceNumber++

// Get Year,Month,Week
const getWeekMonthYear = () => {
    const currentMonth = moment().format("MMMM")
    const currentYear = moment().year()
    const weeks = getWeeksInMonth(currentYear,currentMonth)
    return {currentMonth,currentYear,weeks}
}


// Weeks in a month
const getWeeksInMonth = (year,month) => {
    const startOfMonth = moment().year(year).month(month).startOf('month')
    const endOfMonth = moment().year(year).month(month).endOf('month')
    const weeks = []
    let currentDate = startOfMonth
    let weekCount = 1;

    while(currentDate.isBefore(endOfMonth)){
        //const weekNumber = currentDate.isoWeek()
        if (!weeks.some(week => week.week === weekCount)) {
            weeks.push({ week: weekCount, status: false }); // Store each week and set default status as 'not attended'
        }
        currentDate.add(1,'week')
        weekCount++;
    }
    return weeks
}


// Register Fees
exports.registerFees = async (course,newuser,res) => {
    console.log("inside register fees");
    let feesModal

    switch (course) {
        case "Piano":
            feesModal = feesPiano
            break;
        case "Western Vocals":
            feesModal = feesVocal
            break;
        default:
            return res.status(400).json({ error: "Invalid course name" });
    }

    const{currentMonth,currentYear} = getWeekMonthYear()

    const userFees = new feesModal({
        userId:newuser._id,
        fees:[{ month:currentMonth, year:currentYear, status:false, transactionId:"transactionId" , invoice:"invoice" }]
    })
    console.log(userFees);

    try {
        await userFees.save()
        console.log('Fees successfully Saved');
    } catch (error) {
        console.error("Error saving fees:", error);
        return res.status(500).json({ error: "Failed to save fees" });
    }
}


// checkout
exports.createOrder = async(req,res) => {
    console.log("hey");
    try {
        const order = await razorpay.orders.create({
            amount:1200,
            currency:'INR',
            receipt:`receipt_order_${new Date().getTime()}`
        })
        console.log(order);
        res.status(200).json(order)
    } catch (error) {
        console.error(error);
    }
}

// Pay Fees
exports.payFees = async(req,res) => {

    const {studentID} = req.params
    console.log(studentID);
    const {course,month,year,razorpay_payment_id} = req.body
    console.log(course,month,year);
    const invoiceNumber = createInvoiceNumber()
    console.log(invoiceNumber);

    let feesModal

    switch (course) {
        case "Piano":
            feesModal = feesPiano
            break;
        case "Western Vocals":
            feesModal = feesVocal
            break;
        default:
            return res.status(400).json({ error: "Invalid course name" });
    }

    try {
        // Find the student
        const student = await students.findOne({studentID});
        if (!student) return res.status(404).json({ error: "Student not found" });
        console.log("Found Student");

        // Create HMAC SHA256 signature using the Razorpay secret key
        // const secret = process.env.RAZORPAY_SECRET;
        // const hmac = crypto.createHmac('sha256', secret);
        // hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
        // const generatedSignature = hmac.digest('hex');

        // Check if the generated signature matches the received signature
        // if (generatedSignature === razorpay_signature) {
        //     console.log('Payment verification successful');

            // Proceed with further processing like updating the database
            // and sending a response to the frontend
        //     return res.status(200).json({ message: 'Payment verified successfully' });
        // } else {
        //     console.error('Invalid signature. Payment verification failed');
        //     return res.status(400).json({ error: 'Invalid signature. Payment verification failed' });
        // }

        const invoiceData = {
            studentID:student.studentID,
            invoiceNumber,
            name:student.name,
            course:course,
            month:month,
            year:year,
            transactionId:razorpay_payment_id
        }
        console.log("invoice data :",invoiceData);

        const invoicePDF = await generatePDF(invoiceData)
        console.log("Invoice PDF");

        const fileName = `${studentID}-${course}-${month}-${year}`
        const pdfUrl = await uploadPDFToS3(invoicePDF,fileName)
        console.log(pdfUrl);

        // Find the fees record
        const feesRecord = await feesModal.findOne({ userId: student._id });
        if (!feesRecord) return res.status(404).json({ error: "Fees record not found" });

        //console.log("crossed feesReecord");

        // Find the specific month's fees
        const monthFees = feesRecord.fees.find(item => item.month === month && item.year === year);
        if (!monthFees) return res.status(404).json({ error: "Fees for the specified month and year not found" });

        // Check if fees are already paid
        if (monthFees.status === true) return res.status(400).json({ message: "User already paid the fees" });

        // Update the fees status and save
        monthFees.invoice = pdfUrl
        monthFees.status = true;
        await feesRecord.save();
        await feesSMS(student.phone,student.name,month,year,course)
        
        console.log("Fees status updated successfully");
        return res.status(200).json({ message: "Fees paid successfully" });
    } catch (error) {
        console.error("Error processing payment:", error);
        return res.status(500).json({ error: "An error occurred while processing the payment" });
    }

}

const generatePDF = async(data) => {
    const logoBase64 = fs.readFileSync(path.join(__dirname, 'assets/logo.png'), { encoding: 'base64' });
    const logoPath = `data:image/png;base64,${logoBase64}`;
    const paidImagePath = `file://${path.join(__dirname, 'assets/paid.png')}`;
    //const date = new Date().toLocaleDateString()
    //console.log('Logo Path:', logoPath);
    //console.log('Paid Image Path:', paidImagePath);
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${data.name}-${data.month}${data.year}-${data.course}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 50px;
                    background-color: rgb(226, 226, 226);
                    color: rgb(0, 0, 0);
                }
                h1 {
                    text-align: center;
                }
                .invoice-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .invoice-details {
                    margin-bottom: 30px;
                }
                .invoice-details div {
                    margin-bottom: 5px;
                }
                .amount {
                    font-size: 20px;
                    font-weight: bold;
                    color: green;
                }
                table, th, td {
                    border: 1px solid black;    
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                } 
                .invoice-details p {
                    font-size: 18px;
                    margin-bottom: 10px; /* Adjust this value for more or less spacing */
                    line-height: 0.9; /* Controls the space between lines within each <p> */
                }
                    
            </style>
        </head>
        <body class="">
            <div class="invoice-header">
                <img src="${logoPath}" alt="" style="width: 150px" />
                <h1>B# Music Conservatory</h1>
            </div>

            <hr>

            <div style="display:flex; justify-content:space-between;font-size:13px;">
                <p>Invoice Number : ${data.invoiceNumber}</p>
                <p>Date : ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="invoice-details">
                <div class="col-lg-8 d-flex flex-column">
                    <p><strong>Name:</strong>${data.name}</p>
                    <p><strong>Student ID:</strong> ${data.studentID}</p>
                    <p><strong>Course:</strong> ${data.course}</p>
                    <p><strong>Transaction ID:</strong> ${data.razorpay_payment_id}</p>  
                </div>    
            </div>

            <hr>

            <div style="display:flex ; justify-content:space-around">
                <div style="text-align:center"><strong>Month,Year</strong></div>
                <div style="text-align:center"><strong>Amount</strong></div>
            </div>

            <hr>

            <div style="display:flex ; justify-content:space-around">
                <div style="text-align:center"><strong>${data.month} ${data.year}</strong></div>
                <div style="text-align:center"><strong>1200</strong></div>
            </div>

            <hr>

            <div class="footer">
                <p style="font-size: 16px; font-weight: 700">
                    Thank you for your payment!
                </p>
                <div style="font-size: 14px">
                    <div >For any queries, please contact us:</div>
                    <div>Email: bsharpmusic@gmail.com</div>
                    <div>Phone: +91 8113000923</div>
                </div>
            </div>
        </body>
        </html>
    `

    const browser = await puppeteer.launch()
    console.log("browser");
    const page = await browser.newPage()
    console.log("page");
    await page.setContent(htmlContent)

    const filePath = await page.pdf({ format:'A5', printBackground:true })

    return filePath
}

// Get PDF
exports.getPdf = async (req,res) => {

    const {studentID} = req.params
    console.log(studentID);
    let { course, month, year } = req.query;
    console.log(course,month,year);
    year = parseInt(year, 10);
    console.log("Year (after parsing):", year, "Type:", typeof year);

    let feesModal;

    switch (course) {
        case "Piano":
            feesModal = feesPiano
            break;
        case "Western Vocals":
            feesModal = feesVocal
            break;
        default:
            return res.status(400).json({ error: "Invalid course name" });
    }

    try {

        const student = await students.findOne({studentID})
        if (!student) return res.status(404).json("Student not found");
        console.log("Student Present");

        // Find the fees record
        const feesRecord = await feesModal.findOne({ userId: student._id });
        if (!feesRecord) return res.status(404).json({ error: "Fees record not found" });

         
        console.log("crossed fees Record :", feesRecord);

        if (!Array.isArray(feesRecord.fees)) return res.status(500).json({ error: "Invalid fees structure in database" });

         // Find the specific month's fees
        const monthFees = feesRecord.fees.find(item => item.month === month && item.year === year);
        if (!monthFees) return res.status(404).json({ error: "Fees for the specified month and year not found" });

        console.log("crossed fees month fees : ");

        const pdfInvoice = monthFees.invoice

        console.log("pdf Invoice :",pdfInvoice);

        //res.status(200).json(pdfInvoice);

        res.set({
            'Content-Disposition': `attachment; filename=${student.name}-${course}-${month}-${year}.pdf`, // Suggest a file name for download
            'Content-Type': 'application/pdf', // Ensure the correct content type
        });

        res.send(pdfInvoice);
        console.log("ended");  
    } catch (error) {
        console.error('Error retrieving PDF:',error);
        res.status(500).send('Internal Server Error');
    }
}