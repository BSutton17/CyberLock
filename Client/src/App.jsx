import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { io } from "socket.io-client";
import './App.css'

let socket = io.connect("http://localhost:3001");
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      
    </>
  )
}

export default App
