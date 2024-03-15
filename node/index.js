require('dotenv').config()
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const socketIo = require('socket.io')
const https = require('https')
const fs = require('fs')
const express = require('express')
const app = express()

const {createClient} = require('redis')

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
    },
})

io.on('connection', async (socket) =>{
    const client =
    await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

    socket.on('get:user', async(user) =>{
        await client.set(user.number, socket.id)
        .finally(() => console.log(socket.id,':', user.name, 'connected with', user.number))

    })
    socket.on('offer', async handshake =>{
        // reciever shoud contain socket id
        const reciever = await client.get(handshake.reciever, 'reciver')

        // caller should contain caller socket id & signal
        io.to(reciever).emit('get:offer', handshake.caller)
    })

    socket.on('accept', async handshake => {
        const caller = await client.get(handshake.caller.number)
        io.to(caller).emit('call:accepted', handshake.endReciever)
    })
    socket.on('decline', async caller => {
        const callerId = await client.get(caller.number)
        console.log(callerId, caller)
        io.to(callerId).emit('decline')
    })

    socket.on('leave', async handshake => {
        const endPeer = await client.get(handshake.endPeer.number)
        io.to(endPeer).emit('user:left', handshake.peer)
    })

    socket.on('disconnect', ()=>{
        
        console.log('user:', socket.id,'is disconnected')
        socket.broadcast.emit('call:end')
    })
})

server.listen(5001, ()=>{
    console.log('socket server runing on', 5001)
    
})