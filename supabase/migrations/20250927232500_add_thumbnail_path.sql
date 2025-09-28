/*
  # Agregar columna thumbnail_path a la tabla videos

  1. Modificación de tabla
    - Agregar columna `thumbnail_path` (text) a la tabla `videos`
    - Esta columna almacenará la ruta del thumbnail en el bucket thumbnails

  2. Funcionalidad
    - Permitir valores NULL para videos existentes sin thumbnail
    - La columna será obligatoria para nuevos videos procesados
*/

-- Agregar columna thumbnail_path a la tabla videos
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Crear índice para mejorar consultas por thumbnail_path
CREATE INDEX IF NOT EXISTS videos_thumbnail_path_idx ON videos(thumbnail_path);

-- Comentario en la columna para documentación
COMMENT ON COLUMN videos.thumbnail_path IS 'Ruta del thumbnail del video en el bucket thumbnails';
