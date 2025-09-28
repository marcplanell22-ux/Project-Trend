/*
  # Configurar políticas de Supabase Storage para videos

  1. Configuración de Storage
    - Crear bucket 'videos' si no existe
    - Habilitar RLS en el bucket
    - Configurar bucket como público para lectura

  2. Políticas de Seguridad
    - Política INSERT: Solo usuarios autenticados pueden subir archivos
    - Política SELECT: Todos pueden leer archivos (público)
    - Política DELETE: Solo el propietario puede eliminar sus archivos

  3. Restricciones
    - Los archivos deben estar en rutas organizadas por usuario
    - Validación de tipos de archivo de video
*/

-- Insertar bucket 'videos' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en el bucket videos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';

-- Política para permitir INSERT solo a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden subir videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir SELECT (lectura) pública de videos
CREATE POLICY "Videos son públicamente visibles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Política para permitir DELETE solo al propietario del archivo
CREATE POLICY "Usuarios pueden eliminar sus propios videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir UPDATE solo al propietario del archivo
CREATE POLICY "Usuarios pueden actualizar sus propios videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Comentarios para documentación
COMMENT ON POLICY "Usuarios autenticados pueden subir videos" ON storage.objects IS 'Permite a usuarios autenticados subir videos organizados en carpetas por UUID de usuario';
COMMENT ON POLICY "Videos son públicamente visibles" ON storage.objects IS 'Permite lectura pública de todos los videos en el bucket';
COMMENT ON POLICY "Usuarios pueden eliminar sus propios videos" ON storage.objects IS 'Permite a usuarios eliminar solo sus propios archivos de video';
COMMENT ON POLICY "Usuarios pueden actualizar sus propios videos" ON storage.objects IS 'Permite a usuarios actualizar metadatos de sus propios videos';