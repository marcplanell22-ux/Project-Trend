/*
  # Crear tabla de likes de videos

  1. Nuevas Tablas
    - `likes`
      - `user_id` (uuid, referencia a profiles.id)
      - `video_id` (bigint, referencia a videos.id)
      - `created_at` (timestamptz, con valor por defecto now())
      - Clave primaria compuesta (user_id, video_id)

  2. Seguridad
    - Habilitación de RLS en la tabla `likes`
    - Política para que usuarios autenticados lean todos los likes
    - Política para que usuarios autenticados inserten solo sus propios likes
    - Política para que usuarios autenticados eliminen solo sus propios likes

  3. Funcionalidades adicionales
    - Índices para mejorar rendimiento en consultas frecuentes
    - Restricciones de clave foránea con CASCADE
    - Timestamp de creación para auditoría
*/

-- Crear la tabla likes si no existe
CREATE TABLE IF NOT EXISTS likes (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  video_id bigint REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

-- Habilitar Row Level Security
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir a usuarios autenticados leer todos los likes
CREATE POLICY "Usuarios pueden ver todos los likes"
  ON likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados insertar solo sus propios likes
CREATE POLICY "Usuarios pueden dar like como ellos mismos"
  ON likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permitir a usuarios autenticados eliminar solo sus propios likes
CREATE POLICY "Usuarios pueden quitar sus propios likes"
  ON likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS likes_video_id_idx ON likes(video_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_created_at_idx ON likes(created_at DESC);

-- Comentarios en las columnas para documentación
COMMENT ON TABLE likes IS 'Tabla de likes de usuarios en videos';
COMMENT ON COLUMN likes.user_id IS 'UUID del usuario que dio like (referencia a profiles)';
COMMENT ON COLUMN likes.video_id IS 'ID del video que recibió el like (referencia a videos)';
COMMENT ON COLUMN likes.created_at IS 'Timestamp de cuando se dio el like';