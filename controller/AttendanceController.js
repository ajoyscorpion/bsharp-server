const { students, feesPiano, feesVocal } = require("../models/newRegister");
const attendancePiano = require("../models/newRegister").attendancePiano
const attendanceVocal = require("../models/newRegister").attendanceVocal
const moment = require('moment')


const getWeekMonthYear = () => {
    const currentMonth = moment().format("MMMM")
    const currentYear = moment().year()
    const weeks = getWeeksInMonth(currentYear,currentMonth)
    return {currentMonth,currentYear,weeks}
}


exports.discontinue = async(req,res) => {
    const {userId,courseName} = req.body
    console.log(userId);
    console.log(courseName);

    try {
        const student = await students.findOne({_id:userId})

        const course = student.courses.find(item => item.courseName === courseName)

        console.log(course);

        if (course) {
            course.status = false
            await student.save()
            res.status(200).json({
                message: "Course discontinued successfully",
                student
            });
        } else {
            res.status(404).json({ message: "Course not found" });
        }  
        
    } catch (error) {
        res.status(400).json(error)
    }
}


exports.restart = async(req,res) => {
    console.log("Inside restart");
    const {userId,courseName} = req.body

    try {
        const student = await students.findOne({_id:userId})
        if (!student) return res.status(400).json({ error: "Student not found" });

        const course = student.courses.find(item => item.courseName === courseName)
        if (!course) return res.status(400).json({ error: "Course not found" });

        console.log(course);

        // If the course was discontinued, restart it
        if (course.status === false) {
            course.status = true;

            let attendanceModal
            let feesModal

            switch (courseName) {
                case "Piano":
                    attendanceModal = attendancePiano
                    feesModal = feesPiano
                    break;
                
                case "Western Vocals":
                    attendanceModal = attendanceVocal
                    feesModal = feesVocal
                    break;
            
                default:
                    return res.status(400).json({ error: "Invalid course name" });
            }

            const{currentMonth,currentYear,weeks} = getWeekMonthYear()

            let courseAttendance = await attendanceModal.findOne({userId:student._id})
            console.log(courseAttendance);

            let courseFees = await feesModal.findOne({userId:student._id})
            console.log(courseFees);

            courseAttendance.attendance.push({
                month:currentMonth,
                year:currentYear,
                weeks:weeks.map(week => ({
                    week:week.week,
                    status:week.status
                }))
            })

            courseFees.fees.push({
                month:currentMonth,
                year:currentYear,
                status:false,
                invoice:"invoice"
            })

            await courseAttendance.save();
            await courseFees.save()
            await student.save();

            res.status(200).json({
                message: "Course restarted successfully",
                student
            });
        } else {
            res.status(400).json("Course is currently active and cannot be restarted");
        }
    } catch (error) {
        res.status(400).json(error)
    }
}


// Update Attendance
exports.updateAttendance = async (req,res) => {
    
    const {weekNumber,status,userId,course,month,year} = req.body
    console.log(req.body);

    try {
        //const student = await students.findOne({_id:userId})
        //console.log(student);
        //console.log(student._id);
        //const studentId = student._id
        //console.log(studentId);
        let attendanceRecord
        let attendanceModal

        switch (course) {
            case "Piano":
                attendanceModal = attendancePiano
                break;
            case "Western Vocals":
                attendanceModal = attendanceVocal
                break;
            default:
                return res.status(400).json({ error: "Invalid course name" });
        }

        attendanceRecord = await attendanceModal.findOne({ 
            userId: userId,
            "attendance.month": month,
            "attendance.year": year, 
        })
        console.log(attendanceRecord);
        if (!attendanceRecord) return res.status(404).json({ error: "Attendance record not found" });

        const attendanceData = attendanceRecord.attendance.find(item => item.month === month && item.year === year)
        console.log(attendanceData);
        if (!attendanceData) return res.status(404).json({ error: "Attendance data for this month and year not found" });
        
        const weekToUpdate = attendanceData.weeks.find(item => item.week === weekNumber)
        console.log(weekToUpdate);
        if (!weekToUpdate) return res.status(404).json({ error: "Week not found in attendance data" });
        
        weekToUpdate.status = status
        console.log(weekToUpdate.status);
        await attendanceRecord.save();
        
        console.log("Attendance updated successfully");
        res.status(200).json({ message: "Attendance updated successfully", attendance: attendanceRecord });
        
    } catch (error) {
        console.error("Error updating attendance:", error);
        res.status(400).json({ error: "Failed to update attendance" });
    }
}


exports.registerAttendance = async(course,newuser,res) => {
    console.log("Inside Register Attendance");
    let attendanceModal;

    switch (course) {
        case "Piano":
            attendanceModal = attendancePiano
            break;
        case "Western Vocals":
            attendanceModal = attendanceVocal
            break;
        default:
            return res.status(400).json({ error: "Invalid course name" });
    }

    const{currentMonth,currentYear,weeks} = getWeekMonthYear()

    const userAttendance = new attendanceModal ({
        userId:newuser._id,
        attendance:[{
            month:currentMonth,
            year:currentYear,
            weeks:weeks.map(week => ({ week:week.week, status:week.status }))
        }]
    })
    console.log(userAttendance);

    try {
        await userAttendance.save();
        console.log("Attendance successfully saved!");
    } catch (attendanceSaveError) {
        console.error("Error saving attendance:", attendanceSaveError);
        return res.status(500).json({ error: "Failed to save attendance" });
    }
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