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
    // Obtener datos del request
    const { owner_id, video_path } = await req.json();
    
    if (!owner_id || !video_path) {
      throw new Error('owner_id y video_path son requeridos');
    }

    console.log(`Procesando video: ${video_path} para usuario: ${owner_id}`);

    // 1. Obtener datos del vídeo subido
    const { data: videoData, error: videoError } = await supabase.storage
      .from('videos')
      .download(video_path);

    if (videoError) {
      throw new Error(`Error al obtener el video: ${videoError.message}`);
    }

    // 2. Lógica para generar miniatura
    // Aquí implementaremos la generación de thumbnail del video
    // Por ahora, simulamos el procesamiento
    
    // 3. Lógica para subir miniatura
    // Aquí subiremos la miniatura generada al storage
    // Por ahora, simulamos la subida de miniatura
    
    // 4. Lógica para guardar en base de datos
    // Insertar registro del video en la base de datos
    const { data: insertData, error: insertError } = await supabase
      .from('videos')
      .insert({
        uploader_id: owner_id,
        storage_path: video_path,
        description: 'Video procesado automáticamente',
        tags: []
      })
      .select();

    if (insertError) {
      throw new Error(`Error al guardar en base de datos: ${insertError.message}`);
    }

    console.log('Video procesado exitosamente:', insertData);
    
    // Respuesta JSON de éxito
    const responseData = {
      success: true,
      message: "Video procesado correctamente",
      video_id: insertData[0]?.id,
      video_path: video_path,
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