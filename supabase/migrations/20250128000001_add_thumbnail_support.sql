/*
  # Agregar soporte para thumbnails de videos

  1. Modificaciones a tabla videos
    - Agregar campo `thumbnail_path` (text, ruta del thumbnail en Storage)
    - Campo opcional para mantener compatibilidad con videos existentes

  2. Configuración de Storage
    - Crear bucket 'thumbnails' si no existe
    - Habilitar RLS en el bucket
    - Configurar bucket como público para lectura
    - Políticas de seguridad similares a videos

  3. Políticas de Seguridad para thumbnails
    - Política INSERT: Solo usuarios autenticados pueden subir thumbnails
    - Política SELECT: Todos pueden leer thumbnails (público)
    - Política DELETE: Solo el propietario puede eliminar sus thumbnails
    - Política UPDATE: Solo el propietario puede actualizar sus thumbnails
*/

-- Agregar campo thumbnail_path a la tabla videos
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Comentario para documentación
COMMENT ON COLUMN videos.thumbnail_path IS 'Ruta del thumbnail del video en Supabase Storage bucket thumbnails';

-- Insertar bucket 'thumbnails' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en el bucket thumbnails
UPDATE storage.buckets 
SET public = true 
WHERE id = 'thumbnails';

-- Política para permitir INSERT solo a usuarios autenticados en thumbnails
CREATE POLICY "Usuarios autenticados pueden subir thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir SELECT (lectura) pública de thumbnails
CREATE POLICY "Thumbnails son públicamente visibles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Política para permitir DELETE solo al propietario del thumbnail
CREATE POLICY "Usuarios pueden eliminar sus propios thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir UPDATE solo al propietario del thumbnail
CREATE POLICY "Usuarios pueden actualizar sus propios thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Comentarios para documentación
COMMENT ON POLICY "Usuarios autenticados pueden subir thumbnails" ON storage.objects IS 'Permite a usuarios autenticados subir thumbnails organizados en carpetas por UUID de usuario';
COMMENT ON POLICY "Thumbnails son públicamente visibles" ON storage.objects IS 'Permite acceso público de lectura a thumbnails';
COMMENT ON POLICY "Usuarios pueden eliminar sus propios thumbnails" ON storage.objects IS 'Permite a usuarios eliminar solo sus propios thumbnails';
COMMENT ON POLICY "Usuarios pueden actualizar sus propios thumbnails" ON storage.objects IS 'Permite a usuarios actualizar solo sus propios thumbnails';
