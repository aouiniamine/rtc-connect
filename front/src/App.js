import { useEffect, useRef, useState } from 'react'
import './App.css'
import Peer from 'simple-peer'
import { io } from 'socket.io-client'

const socket = io('https://192.168.0.3:5001', {

})

function App() {
  const [id, setId] = useState(null)
  const [name, setName] = useState()
  const [endPeer, setEndPeer] = useState('') 
  const onChange = (e)=> setEndPeer(e.target.value)
  const [stream, setStream] = useState(null)
  const [isCalling, setIsCalling] = useState(false)
  const [offerStatus, setOfferStatus] = useState(false)
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
        setOfferStatus(true)
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
    socket.emit('decline', isCalling)
    setIsCalling(null)
  }
  const leave =() =>{
    let handshake = {
      peer: {id, name},
      endPeer: isCalling
    }
    socket.emit('leaveCall', handshake)
    setIsCalling(null)
    setCallStatus(false)
    console.log(peer.current.destroy)
      
    peer.current.destroy()
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
    socket.on('userLeft', endPeer =>{
      setIsCalling(null)
      setCallStatus(false)
      peer.current.destroy()

    })
    socket.on('decline', ()=>{
      setOfferStatus(false)
    })
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
          (<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '5px'}}>
            <button onClick={answer} style={{backgroundColor: 'lightgreen', alignContent: 'center'}}>answer</button>
            <button onClick={decline} style={{backgroundColor: '#ff6e6e', alignContent: 'center'}}>decline</button>
          </div>
          ): (
            <button style={{backgroundColor: '#ff6e6e'}} onClick={leave}>leave</button>
            )}
            
          <audio ref={peerAudio} autoPlay playsInline></audio>
        </div>
      ): offerStatus ?(
        <div>
          <h3>to: {endPeer}</h3>
          <h3>calling ...</h3>
        </div>
      ):(
        <div style={{display: 'flex', flexDirection: 'column', marginTop: '25px'}}>
        <input style={{padding: 10, borderRadius: '5px'}} onChange={onChange} type='text' placeholder='calling to' value={endPeer}></input>
        <button onClick={call} style={{backgroundColor: 'lightgreen', marginTop: '10px', width: '100px', alignSelf: 'center', }}>call</button>
        
      </div>)}
      
    </>
    </div>
  )
}

export default App
