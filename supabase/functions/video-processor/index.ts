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

// Interfaces para tipado
interface VideoProcessorRequest {
  owner_id: string;
  video_path: string;
  description?: string;
  tags?: string[];
}

interface VideoProcessorResponse {
  success: boolean;
  message: string;
  video_id?: number;
  thumbnail_path?: string;
  timestamp: string;
}

// Función para descargar archivo desde Supabase Storage
async function downloadVideoFromStorage(videoPath: string): Promise<Uint8Array> {
  console.log(`Descargando video desde: ${videoPath}`);
  
  const { data, error } = await supabase.storage
    .from('videos')
    .download(videoPath);
  
  if (error) {
    throw new Error(`Error descargando video: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('No se pudo obtener el archivo de video');
  }
  
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Función para generar thumbnail usando ffmpeg
async function generateThumbnail(videoData: Uint8Array): Promise<Uint8Array> {
  console.log('Generando thumbnail con ffmpeg...');
  
  // Crear archivo temporal para el video
  const tempVideoPath = `/tmp/temp_video_${Date.now()}.mp4`;
  const tempThumbnailPath = `/tmp/thumbnail_${Date.now()}.jpg`;
  
  try {
    // Escribir datos del video a archivo temporal
    await Deno.writeFile(tempVideoPath, videoData);
    
    // Usar ffmpeg para generar thumbnail
    const ffmpegCommand = new Deno.Command('ffmpeg', {
      args: [
        '-i', tempVideoPath,
        '-ss', '00:00:01.000', // Capturar frame a 1 segundo
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
      const errorOutput = new TextDecoder().decode(stderr);
      throw new Error(`ffmpeg falló con código ${code}: ${errorOutput}`);
    }
    
    // Leer el thumbnail generado
    const thumbnailData = await Deno.readFile(tempThumbnailPath);
    
    // Limpiar archivos temporales
    await Deno.remove(tempVideoPath).catch(() => {});
    await Deno.remove(tempThumbnailPath).catch(() => {});
    
    console.log('Thumbnail generado exitosamente');
    return thumbnailData;
    
  } catch (error) {
    // Limpiar archivos temporales en caso de error
    await Deno.remove(tempVideoPath).catch(() => {});
    await Deno.remove(tempThumbnailPath).catch(() => {});
    throw error;
  }
}

// Función para subir thumbnail a Supabase Storage
async function uploadThumbnailToStorage(
  thumbnailData: Uint8Array, 
  ownerId: string
): Promise<string> {
  console.log('Subiendo thumbnail a Supabase Storage...');
  
  // Generar nombre único para el thumbnail
  const timestamp = Date.now();
  const thumbnailPath = `${ownerId}/thumbnail_${timestamp}.jpg`;
  
  // Crear Blob con los datos del thumbnail
  const thumbnailBlob = new Blob([thumbnailData], { type: 'image/jpeg' });
  
  // Subir a Supabase Storage
  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(thumbnailPath, thumbnailBlob, {
      contentType: 'image/jpeg',
      upsert: false
    });
  
  if (error) {
    throw new Error(`Error subiendo thumbnail: ${error.message}`);
  }
  
  console.log(`Thumbnail subido exitosamente: ${thumbnailPath}`);
  return thumbnailPath;
}

// Función para insertar registro en la tabla videos
async function insertVideoRecord(
  ownerId: string,
  videoPath: string,
  thumbnailPath: string,
  description?: string,
  tags?: string[]
): Promise<number> {
  console.log('Insertando registro en tabla videos...');
  
  const { data, error } = await supabase
    .from('videos')
    .insert({
      uploader_id: ownerId,
      storage_path: videoPath,
      thumbnail_path: thumbnailPath,
      description: description || null,
      tags: tags || []
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Error insertando en base de datos: ${error.message}`);
  }
  
  console.log(`Registro insertado exitosamente con ID: ${data.id}`);
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
    // 1. Obtener datos del vídeo subido
    if (req.method !== 'POST') {
      throw new Error('Método no permitido. Use POST.');
    }

    const requestBody: VideoProcessorRequest = await req.json();
    const { owner_id, video_path, description, tags } = requestBody;

    // Validar datos requeridos
    if (!owner_id || !video_path) {
      throw new Error('owner_id y video_path son requeridos');
    }

    console.log(`Procesando video para usuario: ${owner_id}`);
    console.log(`Ruta del video: ${video_path}`);

    // 2. Descargar el vídeo desde Supabase Storage
    const videoData = await downloadVideoFromStorage(video_path);

    // 3. Generar thumbnail usando ffmpeg
    const thumbnailData = await generateThumbnail(videoData);

    // 4. Subir thumbnail al bucket thumbnails
    const thumbnailPath = await uploadThumbnailToStorage(thumbnailData, owner_id);

    // 5. Insertar registro en la tabla videos
    const videoId = await insertVideoRecord(
      owner_id,
      video_path,
      thumbnailPath,
      description,
      tags
    );

    // Respuesta JSON de éxito
    const responseData: VideoProcessorResponse = {
      success: true,
      message: "Video procesado exitosamente",
      video_id: videoId,
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
    
    const errorResponse: VideoProcessorResponse = {
      success: false,
      message: error.message,
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