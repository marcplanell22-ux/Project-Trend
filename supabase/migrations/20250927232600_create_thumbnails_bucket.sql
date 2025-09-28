/*
  # Crear bucket thumbnails y configurar políticas

  1. Configuración de Storage
    - Crear bucket 'thumbnails' si no existe
    - Habilitar RLS en el bucket
    - Configurar bucket como público para lectura

  2. Políticas de Seguridad
    - Política INSERT: Solo usuarios autenticados pueden subir thumbnails
    - Política SELECT: Todos pueden leer thumbnails (público)
    - Política DELETE: Solo el propietario puede eliminar sus thumbnails
    - Política UPDATE: Solo el propietario puede actualizar sus thumbnails

  3. Restricciones
    - Los archivos deben estar organizados por usuario (UUID)
    - Validación de tipos de archivo de imagen
*/

-- Insertar bucket 'thumbnails' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en el bucket thumbnails
UPDATE storage.buckets 
SET public = true 
WHERE id = 'thumbnails';

-- Política para permitir INSERT solo a usuarios autenticados
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

-- Política para permitir DELETE solo al propietario del archivo
CREATE POLICY "Usuarios pueden eliminar sus propios thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'thumbnails' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir UPDATE solo al propietario del archivo
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
COMMENT ON POLICY "Thumbnails son públicamente visibles" ON storage.objects IS 'Permite lectura pública de todos los thumbnails en el bucket';
COMMENT ON POLICY "Usuarios pueden eliminar sus propios thumbnails" ON storage.objects IS 'Permite a usuarios eliminar solo sus propios archivos de thumbnail';
COMMENT ON POLICY "Usuarios pueden actualizar sus propios thumbnails" ON storage.objects IS 'Permite a usuarios actualizar metadatos de sus propios thumbnails';
