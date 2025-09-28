/*
  # Crear tabla de seguidores

  1. Nuevas Tablas
    - `followers`
      - `follower_id` (uuid, referencia a profiles.id, usuario que sigue)
      - `following_id` (uuid, referencia a profiles.id, usuario seguido)
      - `created_at` (timestamptz, con valor por defecto now())
      - Clave primaria compuesta (follower_id, following_id)

  2. Seguridad
    - Habilitación de RLS en la tabla `followers`
    - Política para que usuarios autenticados lean todas las relaciones de seguimiento
    - Política para que usuarios autenticados inserten solo relaciones donde son el seguidor
    - Política para que usuarios autenticados eliminen solo relaciones donde son el seguidor

  3. Funcionalidades adicionales
    - Índices para mejorar rendimiento en consultas frecuentes
    - Restricciones de clave foránea con CASCADE
    - Restricción CHECK para evitar que un usuario se siga a sí mismo
    - Timestamp de creación para auditoría
*/

-- Crear la tabla followers si no existe
CREATE TABLE IF NOT EXISTS followers (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Habilitar Row Level Security
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir a usuarios autenticados leer todas las relaciones de seguimiento
CREATE POLICY "Usuarios pueden ver relaciones de seguimiento"
  ON followers
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados seguir a otros usuarios
CREATE POLICY "Usuarios pueden seguir a otros"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Permitir a usuarios autenticados dejar de seguir (solo sus propias relaciones)
CREATE POLICY "Usuarios pueden dejar de seguir"
  ON followers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON followers(following_id);
CREATE INDEX IF NOT EXISTS followers_follower_id_idx ON followers(follower_id);
CREATE INDEX IF NOT EXISTS followers_created_at_idx ON followers(created_at DESC);

-- Comentarios en las columnas para documentación
COMMENT ON TABLE followers IS 'Tabla de relaciones de seguimiento entre usuarios';
COMMENT ON COLUMN followers.follower_id IS 'UUID del usuario que sigue (referencia a profiles)';
COMMENT ON COLUMN followers.following_id IS 'UUID del usuario seguido (referencia a profiles)';
COMMENT ON COLUMN followers.created_at IS 'Timestamp de cuando se creó la relación de seguimiento';
COMMENT ON CONSTRAINT no_self_follow ON followers IS 'Evita que un usuario se siga a sí mismo';