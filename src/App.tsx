import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Función para cargar videos desde Supabase
  const loadVideos = async () => {
    setLoading(true);
    try {
      // Código existente para descargar/obtener URL del video desde Supabase
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar videos y obtener URLs firmadas
      const videosWithUrls = await Promise.all(
        data.map(async (video) => {
          try {
            const { data: signedData, error: signedError } = await supabase.storage
              .from('videos')
              .createSignedUrl(video.storage_path, 60);
            
            if (signedError) throw signedError;
            
            return {
              ...video,
              videoUrl: signedData.signedUrl
            };
          } catch (error) {
            console.error("Error al cargar videos:", error?.message ?? error, error);
            // si error tiene status o statusCode, imprimir también
            if (error?.status) console.error("status:", error.status);
            // mostrar stack si existe
            if (error?.stack) console.error(error.stack);
            return video;
          }
        })
      );

      setVideos(videosWithUrls);
    } catch (error) {
      console.error("Error al cargar videos:", error?.message ?? error, error);
      // si error tiene status o statusCode, imprimir también
      if (error?.status) console.error("status:", error.status);
      // mostrar stack si existe
      if (error?.stack) console.error(error.stack);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Project Trend
          </h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {loading ? (
            <div className="text-center">
              <p className="text-gray-600">Cargando videos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {video.description || 'Sin descripción'}
                    </h3>
                    {video.videoUrl && (
                      <video 
                        controls 
                        className="w-full h-48 object-cover rounded"
                        src={video.videoUrl}
                      >
                        Tu navegador no soporta el elemento video.
                      </video>
                    )}
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Subido: {new Date(video.created_at).toLocaleDateString()}</p>
                      {video.tags && video.tags.length > 0 && (
                        <div className="mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {video.tags.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
