import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [videos, setVideos] = useState([])

  useEffect(() => {
    // Placeholder for video loading logic
    console.log('App component mounted')
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Project Trend</h1>
        <p>Plataforma para descubrir tendencias creativas</p>
      </header>
    </div>
  )
}

export default App
