import { createClient } from 'npm:@supabase/supabase-js@2';

// Configuración de CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Crear cliente de Supabase usando variables de entorno
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Interfaz para los datos del video
interface VideoData {
  owner_id: string;
  video_path: string;
  description?: string;
  tags?: string[];
}

// Función para descargar video del bucket
async function downloadVideo(videoPath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from('videos')
    .download(videoPath);
  
  if (error) {
    throw new Error(`Error descargando video: ${error.message}`);
  }
  
  return new Uint8Array(await data.arrayBuffer());
}

// Función para extraer thumbnail usando ffmpeg
async function extractThumbnail(videoData: Uint8Array, videoPath: string): Promise<Uint8Array> {
  // Crear archivo temporal para el video
  const tempVideoPath = `/tmp/video_${Date.now()}.mp4`;
  const tempThumbnailPath = `/tmp/thumbnail_${Date.now()}.jpg`;
  
  try {
    // Escribir datos del video al archivo temporal
    await Deno.writeFile(tempVideoPath, videoData);
    
    // Ejecutar ffmpeg para extraer thumbnail
    const ffmpegCommand = new Deno.Command('ffmpeg', {
      args: [
        '-i', tempVideoPath,
        '-ss', '00:00:01', // Extraer frame en el segundo 1
        '-vframes', '1',
        '-q:v', '2', // Calidad alta
        '-y', // Sobrescribir archivo de salida
        tempThumbnailPath
      ],
      stdout: 'piped',
      stderr: 'piped'
    });
    
    const { code, stderr } = await ffmpegCommand.output();
    
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Error ejecutando ffmpeg: ${errorText}`);
    }
    
    // Leer el thumbnail generado
    const thumbnailData = await Deno.readFile(tempThumbnailPath);
    
    // Limpiar archivos temporales
    await Deno.remove(tempVideoPath).catch(() => {});
    await Deno.remove(tempThumbnailPath).catch(() => {});
    
    return thumbnailData;
  } catch (error) {
    // Limpiar archivos temporales en caso de error
    await Deno.remove(tempVideoPath).catch(() => {});
    await Deno.remove(tempThumbnailPath).catch(() => {});
    throw error;
  }
}

// Función para subir thumbnail al bucket
async function uploadThumbnail(thumbnailData: Uint8Array, ownerId: string): Promise<string> {
  const thumbnailPath = `${ownerId}/thumbnail_${Date.now()}.jpg`;
  
  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(thumbnailPath, thumbnailData, {
      contentType: 'image/jpeg',
      upsert: false
    });
  
  if (error) {
    throw new Error(`Error subiendo thumbnail: ${error.message}`);
  }
  
  return thumbnailPath;
}

// Función para insertar video en la base de datos
async function insertVideoRecord(videoData: VideoData, thumbnailPath: string): Promise<number> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      uploader_id: videoData.owner_id,
      description: videoData.description || null,
      storage_path: videoData.video_path,
      tags: videoData.tags || [],
      thumbnail_path: thumbnailPath
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Error insertando en base de datos: ${error.message}`);
  }
  
  return data.id;
}

// Función principal que maneja las peticiones
Deno.serve(async (req: Request) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // 1. Parsear datos del vídeo subido
    const requestData = await req.json();
    
    // Validar datos requeridos
    if (!requestData.owner_id || !requestData.video_path) {
      throw new Error('Faltan datos requeridos: owner_id y video_path son obligatorios');
    }
    
    const videoData: VideoData = {
      owner_id: requestData.owner_id,
      video_path: requestData.video_path,
      description: requestData.description,
      tags: requestData.tags
    };
    
    console.log('Procesando video:', videoData.video_path, 'para usuario:', videoData.owner_id);
    
    // 2. Descargar video del bucket
    console.log('Descargando video del bucket...');
    const videoBytes = await downloadVideo(videoData.video_path);
    console.log(`Video descargado: ${videoBytes.length} bytes`);
    
    // 3. Extraer thumbnail usando ffmpeg
    console.log('Extrayendo thumbnail...');
    const thumbnailBytes = await extractThumbnail(videoBytes, videoData.video_path);
    console.log(`Thumbnail extraído: ${thumbnailBytes.length} bytes`);
    
    // 4. Subir thumbnail al bucket thumbnails
    console.log('Subiendo thumbnail...');
    const thumbnailPath = await uploadThumbnail(thumbnailBytes, videoData.owner_id);
    console.log('Thumbnail subido en:', thumbnailPath);
    
    // 5. Insertar registro en la base de datos
    console.log('Insertando registro en base de datos...');
    const videoId = await insertVideoRecord(videoData, thumbnailPath);
    console.log('Video insertado con ID:', videoId);
    
    // Respuesta JSON de éxito
    const responseData = {
      success: true,
      message: "Video procesado correctamente",
      video_id: videoId,
      video_path: videoData.video_path,
      thumbnail_path: thumbnailPath,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error('Error en edge function:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }
});