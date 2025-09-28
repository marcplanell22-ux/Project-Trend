import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadVideos = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch videos from database
      const { data: videoData, error: dbError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError

      // Get signed URLs for each video
      const videosWithUrls = await Promise.all(
        videoData.map(async (video) => {
          try {
            const { data, error } = await supabase.storage
              .from('videos')
              .createSignedUrl(video.storage_path, 60) // 60 seconds expiry
            
            if (error) throw error
            
            return {
              ...video,
              videoUrl: data.signedUrl
            }
          } catch (error) {
            console.error("Error al cargar videos:", error?.message ?? error, error);
            // si error tiene status o statusCode, imprimir también
            if (error?.status) console.error("status:", error.status);
            // mostrar stack si existe
            if (error?.stack) console.error(error.stack);
            
            return {
              ...video,
              videoUrl: null,
              error: error.message
            }
          }
        })
      )

      setVideos(videosWithUrls)
    } catch (error) {
      console.error("Error al cargar videos:", error?.message ?? error, error);
      // si error tiene status o statusCode, imprimir también
      if (error?.status) console.error("status:", error.status);
      // mostrar stack si existe
      if (error?.stack) console.error(error.stack);
      
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Project Trend</h1>
        <p>Plataforma para descubrir tendencias creativas</p>
      </header>
      
      <main className="App-main">
        {loading && <p>Cargando videos...</p>}
        {error && <p className="error">Error: {error}</p>}
        
        <div className="videos-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <h3>{video.description || 'Sin descripción'}</h3>
              {video.videoUrl ? (
                <video 
                  controls 
                  src={video.videoUrl}
                  style={{ width: '100%', maxWidth: '300px' }}
                >
                  Tu navegador no soporta el elemento video.
                </video>
              ) : (
                <p className="error">Error al cargar video: {video.error}</p>
              )}
              <p className="video-meta">
                Subido: {new Date(video.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
