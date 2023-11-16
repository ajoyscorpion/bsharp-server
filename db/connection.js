// const mongoose = require('mongoose')
// const connectionString = process.env.DATABASE

// mongoose.connect(connectionString,{
//     useUnifiedTopology:true,
//     useNewUrlParser:true
// }).then(()=>{
//     console.log("Mongo db Atlas connected Successfully");
// }).catch((err)=>{
//     console.log(`Mongo db Connection Error : ${err}`);
// })

const mongoose = require('mongoose')
const connectionString = process.env.DATABASE

mongoose.connect(connectionString,{
    useUnifiedTopology:true,
    useNewUrlParser:true
}).then(()=>{
    console.log("Mongo db Atlas connected successfully");
}).catch((err)=>{
    console.log('Mongo db Connection Error : ${err}');
})