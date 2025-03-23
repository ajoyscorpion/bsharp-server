//const students = require('../models/newRegister').students
const crypto = require('crypto-js');
const fees = require('../models/newRegister').fees
const attendancePiano = require("../models/newRegister").attendancePiano
const attendanceVocal = require("../models/newRegister").attendanceVocal
const moment = require('moment')
const cron = require('node-cron');
const { feesPiano, feesVocal, adminLogin } = require('../models/newRegister');
const { attendancePianoRegister, attendanceVocalRegister, registerAttendance } = require('./AttendanceController');
const { registerFees } = require('./FeesController');
const students  = require('../models/newRegister').students;
const storeOTP = require('../hashOTP/OTP').storeOTP
const verifyOTP = require('../hashOTP/OTP').verifyOTP
const generateOTP = require("../hashOTP/OTP").generateOTP
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const twilio = require('twilio');
const { sendSMS, registerSMS } = require('../twilio/sendSMS');


const studentID = () => `BID${Math.floor(1000 + Math.random() * 9000)}`


// Register
exports.register = async(req,res)=>{
    console.log("register");
    const {name,email,phone,courses} = req.body
    if(!name || (!email && !phone) || !courses) return res.status(403).json("All inputs are required")
    
    try{
        console.log("1");
        const preuser = await students.findOne({phone})
        if(preuser) return res.status(406).json("Already exist")
        
        console.log("2");
        const newStudentId = studentID()
        console.log(newStudentId);

        const coursesWithStatus = courses.map(course => ({
            courseName:course,
            status:true,
            grade:"Yet to Update",
            batch:"Yet to Update",
            meetingLink:"Yet to Update",
            whatsappGroup:"Yet to Update",
        }))
        console.log(coursesWithStatus);

        const newuser = new students({
            name:name,
            email:email,
            phone:phone,
            courses:coursesWithStatus,
            studentID:newStudentId,  
        })
        console.log(newuser);
        await newuser.save()

        for(let course of courses){
            console.log(course);
            if(course === 'Piano' || course === "Western Vocals"){
                await registerAttendance(course,newuser)
                await registerFees(course,newuser)
            }
        }

        await registerSMS(phone,name)
        res.status(200).json(newuser)    
    }
    catch(error){
        res.status(401).json(error)
    }    
}


// Login
exports.login = async(req,res) => {

    const {mobileNumber,otp} = req.body
    console.log(mobileNumber,otp);

    try {
        console.log("1");
        const isVerified = await verifyOTP(mobileNumber,otp)
        console.log("isVerified:",isVerified);

        if(isVerified){
            console.log("3");
            const user = await students.findOne({phone:mobileNumber})
            console.log("4");
            if(!user) return res.status(404).json("User not found");
            console.log("5");

            // JWT token
            const token = jwt.sign(
                {userId:user._id},
                process.env.JWT_SECRET,
                {expiresIn:'1h'}    
            )
            console.log(token);

            return res.status(200).json({ message:"Login Successfull", user:user, token:token })

        } else {
            return res.status(400).json({ message:"OTP Verification Failed" })
        }
        
    } catch (error) {
        console.error("Error during login:", error);
        res.status(400).json("failed to login")
    }
}

// Send OTP
exports.sendOTP = async (req,res) => {

    const {mobileNumber} = req.body
    console.log(mobileNumber);
    const OTP = generateOTP()
    console.log(OTP);

    try {
        console.log("user verification");
        const user = await students.findOne({phone:mobileNumber})
        console.log(user);
        if (user) {
            //await sendSMS(mobileNumber,OTP)
            console.log("user found");
            await storeOTP(mobileNumber,OTP)
            console.log("2");
            console.log(OTP);
            res.status(200).json({ message: "OTP sent successfully" })
        } else {
            console.log("No User");
            res.status(400).json("No user found, Please register")
        }    
    } catch (error) {
        res.status(400).json("Failed to send otp")
    }
}



// Delete
exports.delete = async(req,res) => {
    const{ userId } = req.body
    console.log(userId);

    try {
        const student = await students.findOne({_id:userId})
        if (!student) return res.status(404).json({ error: "Student not found" });
        console.log(student);

        for(let course of student.courses){
            if(course.courseName === "Piano"){
                await attendancePiano.deleteMany({userId:student._id})
                await feesPiano.deleteMany({userId:student._id})
            } else if ( course.courseName === 'Western Vocals'){
                await attendanceVocal.deleteMany({userId:student._id})
                await feesVocal.deleteMany({userId:student._id})
            }
        }

        await students.deleteOne({_id:userId})
        res.status(200).json("Successfully Deleted Student")
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(400).json("Failed to delete student");
    }
}


// Update Student
exports.updateStudent = async (req, res) => {
    console.log("inside update Student");
    const { name, email, phone, courses, _id } = req.body;
    console.log(name, email, phone, courses, _id);

    try {

        // const updateFields = {
        //     ...(name && { name }),
        //     ...(email && { email }),
        //     ...(phone && { phone }),
        //     ...(courses && { courses: courses.map(item => ({
        //         courseName: item.courseName,
        //         meetingLink: item.meetingLink || "Yet to Update",
        //         whatsappGroup: item.whatsappGroup || "Yet to Update",
        //         grade: item.grade || "Yet to Update",
        //         batch: item.batch || "Yet to Update",
        //         status: true
        //     })) })
        // };

        // Prepare the fields for update

        const updateFields = {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone })
        };

        // Update the courses array
        if (courses && courses.length > 0) {
            updateFields.courses = courses.map((item) => ({
                courseName: item.courseName,
                meetingLink: item.meetingLink || "Yet to Update",
                whatsappGroup: item.whatsappGroup || "Yet to Update",
                grade: item.grade || "Yet to Update",
                batch: item.batch || "Yet to Update",
                status: true
            }));
        }

        // Use findByIdAndUpdate to apply updates
        const updatedStudent = await students.findByIdAndUpdate(
            _id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedStudent) return res.status(404).json({ message: "Student not found" });

        console.log("Updated student data:", updatedStudent);

        res.status(200).json({ message: "Student updated successfully.", student: updatedStudent });

    } catch (error) {
        console.error("Error updating student:", error);
        res.status(400).json({ message: "Failed to update student", error });
    }
};


// Student Details
exports.studentDetails = async(req,res) => {
    
    const {studentID} = req.params
    console.log(studentID);

    try {
        
        const student = await students.findOne({studentID})
        if (!student) return res.status(404).json("Student not found");
        console.log(student);
        const studentId = student._id

        // Fetch the student fees
        const pianoFees = await feesPiano.findOne({ userId: studentId });
        console.log("Fees:", pianoFees);

        const vocalFees = await feesVocal.findOne({userId:student._id})
        console.log(("Vocal Fees:",vocalFees));

        // Fetch Piano attendance if available
        const pianoAttendance = await attendancePiano.findOne({ userId: studentId });
        console.log("Piano Attendance:", pianoAttendance);

        // Fetch Western Vocal attendance if available
        const vocalAttendance = await attendanceVocal.findOne({ userId: studentId });
        console.log("Western Vocal Attendance:", vocalAttendance);
        
        // Combine all data into one response
        const studentData = {
            student,
            fees: {
                piano:pianoFees || "No Piano Fees available" ,
                vocal:vocalFees || "No Western Vocal Fees available",
            } || "No fees information available",
            attendance: {
                piano: pianoAttendance || "No Piano attendance available",
                vocal: vocalAttendance || "No Western Vocal attendance available",
            }
        };

        res.status(200).json(studentData);

    } catch (error) {

        res.status(400).json("Failed to Get Student Details")
    
    }
}


// All students
exports.allStudents = async(req,res) => {
    try {
        const allStudents = await students.find()
        res.status(200).json(allStudents)
    } catch (error) {
        res.status(400).json(error)
    }
}


// Add Course
exports.addCourse = async(req,res) => {

    const {mobileNumber,course} = req.body
    console.log(mobileNumber,course);

    try {

        const student = await students.findOne({phone:mobileNumber})
        console.log(student);
        if(!student) return res.status(400).json({error:"No student found"})

        const studentCourses = student.courses.find(item => item.courseName === course)
        console.log(studentCourses);

        if(studentCourses){
            res.status(400).json({error:"Student is already registered for the course"})
        } else {
            student.courses.push({
                courseName:course,
                status:true
            })

            const currentMonth = moment().format("MMMM")
            const currentYear = moment().year()
            const weeks = getWeeksInMonth(currentYear,currentMonth)

            await registerAttendance(course,student,currentMonth,currentYear,weeks)
            console.log(studentCourses);
            await student.save()
            
            console.log("Added Course");
            res.status(200).json({ message:"Added Course" })
        }
    } catch (error) {
        console.error("Error adding course",error);
        res.status(400).json({ error:"Failed to add course" })
    }
}


// Admin Login
exports.loginAdmin = async(req,res) => {
    const {username,password} = req.body
    console.log(password);

    try {

        const adminData = await adminLogin.findOne({username})
        console.log(adminData.username,adminData.password);

        storedPassword = adminData.password

        if (!adminData) return res.status(404).json({ error: 'Admin not found' });

        //if(password === adminData.password) isPasswordValid = true;
        const isPasswordValid =await bcrypt.compare(password, adminData.password);
        console.log(isPasswordValid);
        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });
        
        // JWT token
        const token = jwt.sign(
            {admin:adminData.username,isAdmin:true},
            process.env.JWT_SECRET,
            //{expiresIn:'1h'}    
        )

        res.status(200).json({ message: 'Login successful' , token:token});
        
    } catch (error) {
        console.error(error);
        res.status(400).json(error)
    }
}


// b#admin2024


// create next month attendance and fees
const createNextMonthAttendanceAndFees = async () => {

    const nextMonth = (moment().month() + 1) % 12 + 1
    const nextMonthYear = nextMonth === 1 ? moment().year() + 1 : moment().year()

    try {
        const allStudents = await students.find()
        console.log(allStudents);
        for(let student of allStudents){
            console.log(student);
            for(let course of student.courses){
                if(course.status === true){
                    
                    let attendanceModal

                    switch (course.courseName) {
                        case "Piano":
                            attendanceModal = attendancePiano
                            break;
                        case "Western Vocals":
                            attendanceModal = attendanceVocal
                            break;
                        default:
                            return res.status(400).json({ error: "Invalid course name" });
                    }

                    const userAttendance = await attendanceModal.findOne({
                        userId:student._id,
                        "attendance.month":nextMonth,
                        "attendance.year":nextMonthYear
                    })

                    if(!userAttendance){
                        const weeks = getWeeksInMonth(nextMonthYear,nextMonth)
                        const newAttendance = new attendanceModal({
                            userId:student._id,
                            attendance:[{
                                month:nextMonth,
                                year:nextMonthYear,
                                weeks:weeks.map(week => ({
                                    week,
                                    status:false
                                }))
                            }]
                        })
                
                        await newAttendance.save()
                        console.log("Next Month Attendance created");
                    }

                    const userFees = await fees.findOne({
                        userId:student._id,
                        "fees.month":nextMonth,
                        "fees.year":nextMonthYear
                    })
                
                    if(!userFees){
                        const newFees = new fees({
                            userId:student._id,
                            fees:[{
                                month:nextMonth,
                                year:nextMonthYear,
                                status:false,
                                invoice:"Invoice"
                            }]    
                        })
                
                        await newFees.save()
                        console.log("Next Month Fees created");
                    }
        
                    console.log('Fees and Attendance for next month created!');

                }
            }
        }   
        
    } catch (error) {
        console.error('Error creating next month attendance or fees:', error);
    }
}


cron.schedule('0 0 28-31 * *', async () => {
    const today = moment();
    const isLastDay = today.isSame(today.clone().endOf('month'), 'day');

    if (isLastDay) {
        console.log('Running the scheduled task to create next month fees and attendance');
        await createNextMonthAttendanceAndFees();
    }
});


