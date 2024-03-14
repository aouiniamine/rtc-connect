require('dotenv').config()
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const socketIo = require('socket.io')
const https = require('https')
const fs = require('fs')
const express = require('express')
const app = express()

app.get('/', (req, res)=> res.send('hello'))

const key = fs.readFileSync('cert/cert.key');
const cert = fs.readFileSync('cert/cert.crt');

const options = {
    key, cert, 
}
const server = https.createServer(options, app)
const io = socketIo(server, {
    cors: {
        origin: [process.env.HOST, process.env.HOST_1, 'https://localhost:3000'],
        methods: ['GET', 'POST'],
        
    },
})

io.on('connection', socket =>{
    console.log('socket:', socket.id, 'is connected.')
    io.to(socket.id).emit('/', socket.id)
    socket.on('callPeer', handshake =>{
        // reciever shoud contain socket id
        // caller should contain caller socket id & signal
        io.to(handshake.reciever).emit('recieveCall', handshake.caller)
    })

    socket.on('answerCall', handshake => {
        io.to(handshake.caller.id).emit('callAnswered', handshake.endReciever)
    })

    socket.on('leaveCall', handshake => {
        io.to(handshake.endPeer.id).emit('userLeft', handshake.peer)
    })

    socket.on('disconnect', ()=>{
        console.log('user:', socket.id,'is disconnected')
        socket.broadcast.emit('endCall')
    })
})

server.listen(5001, ()=>{
    console.log('socket server runing on', 5001)
    
})