require('dotenv').config()
const express = require('express')
const cors = require('cors')
require('./db/connection')
const router = require('./routes/router')
const bodyParser = require('body-parser');

const server = express()
server.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
server.use(express.json())
server.use(router)
server.use(bodyParser.json())

const PORT = 4000 | process.env.PORT

server.listen(PORT,()=>{
    console.log(`B sharp Music server started : ${PORT}`);
})

server.get('/',(req,res)=>{
    res.send('B sharp Music server started')
})