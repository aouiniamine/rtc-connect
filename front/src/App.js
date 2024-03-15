import { useEffect, useRef, useState } from 'react'
import './App.css'
import Peer from 'simple-peer'
import { io } from 'socket.io-client'

const socket = io('https://192.168.0.3:5001', {

})

function App() {
  const [name, setName] = useState()
  const [endPeer, setEndPeer] = useState('') 
  const [number, setNumber] = useState('')
  const onChange = (e)=> setEndPeer(e.target.value)
  const [stream, setStream] = useState(null)
  const [isCalling, setIsCalling] = useState(false)
  const [offerStatus, setOfferStatus] = useState(false)
  const peerAudio = useRef()
  const peer = useRef()
  const [callStatus, setCallStatus] = useState(false)
  const callButtonRef = useRef()
  // callButtonRef.current.onClick = call 
  
  const call = (e) => {
    setOfferStatus(true)
    peer.current = new Peer({
      initiator: true,
      trickle: false,
      stream
    })
    peer.current.on('signal', signal =>{
      
      const handshake = {
        reciever: endPeer,
        caller: {
          number,
          signal,
          name
        }
      }
      socket.emit('offer', handshake)
    })
    
    peer.current.on('stream', stream =>{
      peerAudio.current.srcObject = stream
    })
    
}
  const answer = () =>{
    setCallStatus(true)
    peer.current = new Peer({
        initiator: false,
        trickle: false,
        stream
      })
      peer.current.on('signal', signal =>{

        const handshake = {
          caller: isCalling,
          endReciever: {
            number,
            name,
            signal
          }
        }
        console.log(handshake, 'answer call')
        
        socket.emit('accept', handshake)
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
      peer: {number, name},
      endPeer: isCalling
    }
    socket.emit('leave', handshake)
    setIsCalling(null)
    setCallStatus(false)
    setOfferStatus(false)
      
    peer.current.destroy()
    // peer.audio = null
  }
  useEffect(()=>{
    navigator.mediaDevices.getUserMedia({audio: true})
    .then(stream => setStream(stream))
    .catch(e => console.log(e))
    
    let name = localStorage.getItem('name')
    let number = localStorage.getItem('number')
    if (!name ){
      name = prompt('write your name')
      localStorage.setItem('name', name)
      
    }
    if (!number){
      number = prompt('write your number')
      localStorage.setItem('number', number)
    }
    setName(name)
    setNumber(number)
    
    socket.on('connect',()=>{
      console.log('connected to server.')
      socket.emit('get:user', {number, name})
    })
    socket.on("connect_error", (err) => {
      console.log(err)
    });
    socket.on('get:offer', caller => {
      console.log(caller)
      setIsCalling(caller)
    })
    socket.on('user:left',async endPeer =>{
      console.log(endPeer, 'left')

        setCallStatus(false)
        setIsCalling(null)
        setOfferStatus(null)
        peer.current.destroy()

    })
    socket.on('decline', ()=>{
      setOfferStatus(false)
    })
    socket.on('call:end', ()=>{
      setOfferStatus(false)
      setIsCalling(null)
      
    })
    socket.on('call:accepted', (caller) =>{
      console.log(caller, 'ss')
      if(peer.current){

        setCallStatus(true)
        setIsCalling(caller)
        peer.current.signal(caller.signal)
      }
    })
    return ()=>{
      socket.off('call:accepted')
      socket.off('get:offer')
      socket.off('connect')
      socket.off('call:end')
      socket.off('decline')
      socket.off('user:left')
      socket.off('connect_error')
      socket.off('call:accepted')
    }
    
  }, [])

  return (
    <div style={{width: '300px', height: '270px', alignSelf: 'center',}}>
    <>
      
      <div>
        <h2>{name}</h2>
        <h3>{number}</h3>
      </div>
      <p>----------------------</p>
      {isCalling ? 
      (
        <div>
          <h3>{isCalling.name}: {isCalling.number}</h3>
         
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
        <button disabled={offerStatus} id='call' onClick={call} ref={callButtonRef} style={{backgroundColor: 'lightgreen', marginTop: '10px', width: '100px', alignSelf: 'center', }}>call</button>
        
      </div>)}
      
    </>
    </div>
  )
}

export default App
