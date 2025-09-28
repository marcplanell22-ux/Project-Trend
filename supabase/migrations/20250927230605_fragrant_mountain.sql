/*
  # Crear tabla de videos

  1. Nuevas Tablas
    - `videos`
      - `id` (bigint, clave primaria, autoincremental)
      - `created_at` (timestamptz, con valor por defecto now())
      - `uploader_id` (uuid, referencia a profiles.id)
      - `description` (text, descripción del video)
      - `storage_path` (text, ruta del archivo en Supabase Storage)
      - `tags` (text[], array de tags/etiquetas)

  2. Seguridad
    - Habilitación de RLS en la tabla `videos`
    - Política para que usuarios autenticados lean todos los videos
    - Política para que usuarios autenticados inserten videos con su propio uploader_id
    - Política para que usuarios autenticados actualicen solo sus propios videos
    - Política para que usuarios autenticados eliminen solo sus propios videos

  3. Funcionalidades adicionales
    - Índices para mejorar rendimiento en consultas frecuentes
    - Restricción de clave foránea con CASCADE en uploader_id
*/

-- Crear la tabla videos si no existe
CREATE TABLE IF NOT EXISTS videos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  uploader_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  description text,
  storage_path text NOT NULL,
  tags text[] DEFAULT '{}'::text[]
);

-- Habilitar Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir a usuarios autenticados leer todos los videos (videos públicos)
CREATE POLICY "Usuarios pueden ver todos los videos"
  ON videos
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados insertar videos con su propio uploader_id
CREATE POLICY "Usuarios pueden subir sus propios videos"
  ON videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

-- Permitir a usuarios autenticados actualizar solo sus propios videos
CREATE POLICY "Usuarios pueden actualizar sus propios videos"
  ON videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploader_id)
  WITH CHECK (auth.uid() = uploader_id);

-- Permitir a usuarios autenticados eliminar solo sus propios videos
CREATE POLICY "Usuarios pueden eliminar sus propios videos"
  ON videos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploader_id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS videos_uploader_id_idx ON videos(uploader_id);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS videos_tags_idx ON videos USING GIN(tags);

-- Comentarios en las columnas para documentación
COMMENT ON TABLE videos IS 'Tabla de videos subidos por usuarios';
COMMENT ON COLUMN videos.id IS 'ID autoincremental único del video';
COMMENT ON COLUMN videos.created_at IS 'Timestamp de cuando se subió el video';
COMMENT ON COLUMN videos.uploader_id IS 'UUID del usuario que subió el video (referencia a profiles)';
COMMENT ON COLUMN videos.description IS 'Descripción del video';
COMMENT ON COLUMN videos.storage_path IS 'Ruta del archivo de video en Supabase Storage';
COMMENT ON COLUMN videos.tags IS 'Array de tags/etiquetas del video';