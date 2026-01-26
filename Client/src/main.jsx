import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HomeScreen from './GameComponents/HomeScreen.jsx'
import { GameProvider } from './Components/Context.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <HomeScreen />
    </GameProvider>
  </StrictMode>,
)
