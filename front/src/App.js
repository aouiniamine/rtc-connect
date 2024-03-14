import { useEffect, useRef, useState } from 'react'
import './App.css'
import Peer from 'simple-peer'
import { io } from 'socket.io-client'

const socket = io('https://192.168.56.1:5001', {

})

function App() {
  const [id, setId] = useState(null)
  const [name, setName] = useState()
  const [endPeer, setEndPeer] = useState('') 
  const onChange = (e)=> setEndPeer(e.target.value)
  const [stream, setStream] = useState(null)
  const [isCalling, setIsCalling] = useState(false)
  const peerAudio = useRef()
  const peer = useRef()
  const [callStatus, setCallStatus] = useState(false)

  const call = () => {
    
      peer.current = new Peer({
        initiator: true,
        trickle: false,
        stream
      })
      peer.current.on('signal', signal =>{
        
        const handshake = {
          reciever: endPeer,
          caller: {
            id,
            signal,
            name
          }
        }
        socket.emit('callPeer', handshake)
      })
      socket.on('callAnswered', ({id, name, signal}) =>{
        setCallStatus(true)
        setIsCalling({id, name})
        peer.current.signal(signal)
      })
      peer.current.on('stream', stream =>{
        peerAudio.current.srcObject = stream
      })
    
  }

  const answer = () =>{
    
    peer.current = new Peer({
        initiator: false,
        trickle: false,
        stream
      })
      peer.current.on('signal', signal =>{

        const handshake = {
          caller: isCalling,
          endReciever: {
            id,
            name,
            signal
          }
        }
        setCallStatus(true)
        console.log(handshake, 'answer call')
        
        socket.emit('answerCall', handshake)
      })
      peer.current.signal(isCalling.signal)
      peer.current.on('stream', stream =>{
        console.log(stream)
        peerAudio.current.srcObject = stream
      })
      
      
  }

  const decline = ()=>{
    setIsCalling(null)
  }
  const leave =() =>{
    setIsCalling(null)
    console.log(peer.current.destroy)
    peer.current.destroy(err=> console.log(err))
    // peer.audio = null
  }
  useEffect(()=>{
    navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => setStream(stream))
    .catch(e => console.log(e))
    
    let name = localStorage.getItem('name')
    if (!name){
      name = prompt('write your name')
      localStorage.setItem('name', name)
    }
    setName(name)
    socket.on('/', socketId => setId(socketId))
    socket.on('recieveCall', caller => {
      console.log(caller)
      setIsCalling(caller)
    })
    socket.on("connect_error", (err) => {
      // console.log(`connect_error due to ${err.message}`);
      console.log(err)
    });
    socket.on('endCall', ()=>{
      setIsCalling(null)
    })
  }, [])

  return (
    <div style={{width: '300px', height: '270px', alignSelf: 'center',}}>
    <>
      
      <div>
        <h2>{name}</h2>
        <h3>{id}</h3>
      </div>
      <p>----------------------</p>
      {isCalling ? 
      (
        <div>
          <h3>{isCalling.name}: {isCalling.id}</h3>
         
          {!callStatus ?
          (<div style={{display: 'flex', flexDirection: 'row',}}>
            <button onClick={answer} style={{backgroundColor: 'lightgreen', alignContent: 'center'}}>answer</button>
            <button onClick={decline} style={{backgroundColor: 'lightsalmon', alignContent: 'center'}}>decline</button>
          </div>
          ): (
            <button onClick={leave}>leave</button>
            )}
            
          <audio ref={peerAudio} autoPlay playsInline></audio>
        </div>
      ):(
        <div style={{display: 'flex', flexDirection: 'column', marginTop: '25px'}}>
        <input style={{padding: 10, borderRadius: '5px'}} onChange={onChange} type='text' placeholder='calling to'></input>
        <button onClick={call} style={{backgroundColor: 'lightgray', marginTop: '10px', width: '100px', alignSelf: 'center', height: '25px',}}>call</button>
        
      </div>)}
      
    </>
    </div>
  )
}

export default App
