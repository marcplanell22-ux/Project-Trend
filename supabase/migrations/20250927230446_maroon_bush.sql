/*
  # Crear tabla de perfiles de usuario

  1. Nuevas Tablas
    - `profiles`
      - `id` (uuid, clave primaria, referencia a auth.users)
      - `updated_at` (timestamptz, con valor por defecto)
      - `username` (text, único, no nulo)
      - `full_name` (text, nombre completo del usuario)
      - `avatar_url` (text, URL del avatar estático)
      - `animated_avatar_url` (text, URL del avatar animado)
      - `banner_url` (text, URL del banner estático)
      - `dynamic_banner_url` (text, URL del banner dinámico/video)
      - `profile_music_url` (text, URL de la música del perfil)
      - `profile_settings` (jsonb, configuraciones personalizadas)

  2. Seguridad
    - Habilitación de RLS en la tabla `profiles`
    - Política para que usuarios autenticados lean todos los perfiles
    - Política para que usuarios autenticados actualicen solo su propio perfil
    - Política para que usuarios autenticados inserten solo su propio perfil
    - Política para que usuarios autenticados eliminen solo su propio perfil

  3. Funcionalidades adicionales
    - Trigger para actualizar automáticamente `updated_at`
    - Índices para mejorar rendimiento en consultas frecuentes
*/

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear la tabla profiles si no existe
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  animated_avatar_url text,
  banner_url text,
  dynamic_banner_url text,
  profile_music_url text,
  profile_settings jsonb DEFAULT '{}'::jsonb
);

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de RLS
-- Permitir a usuarios autenticados leer todos los perfiles (perfiles públicos)
CREATE POLICY "Usuarios pueden ver perfiles públicos"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir a usuarios autenticados insertar solo su propio perfil
CREATE POLICY "Usuarios pueden crear su propio perfil"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Permitir a usuarios autenticados actualizar solo su propio perfil
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permitir a usuarios autenticados eliminar solo su propio perfil
CREATE POLICY "Usuarios pueden eliminar su propio perfil"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON profiles(updated_at);

-- Comentarios en las columnas para documentación
COMMENT ON TABLE profiles IS 'Tabla de perfiles de usuario con información personal y configuraciones';
COMMENT ON COLUMN profiles.id IS 'UUID que referencia al usuario en auth.users';
COMMENT ON COLUMN profiles.updated_at IS 'Timestamp de la última actualización del perfil';
COMMENT ON COLUMN profiles.username IS 'Nombre de usuario único';
COMMENT ON COLUMN profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN profiles.avatar_url IS 'URL del avatar estático del usuario';
COMMENT ON COLUMN profiles.animated_avatar_url IS 'URL del avatar animado del usuario';
COMMENT ON COLUMN profiles.banner_url IS 'URL del banner estático del perfil';
COMMENT ON COLUMN profiles.dynamic_banner_url IS 'URL del banner dinámico/video del perfil';
COMMENT ON COLUMN profiles.profile_music_url IS 'URL de la música del perfil';
COMMENT ON COLUMN profiles.profile_settings IS 'Configuraciones JSON del perfil (colores, preferencias, etc.)';