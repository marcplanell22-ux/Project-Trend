/*
  # Políticas de Supabase Storage para UPDATE y DELETE por propietario

  1. Políticas de Seguridad
    - Política UPDATE: Solo el propietario puede actualizar sus archivos
    - Política DELETE: Solo el propietario puede eliminar sus archivos
    - Verificación basada en auth.uid() vs owner del archivo

  2. Validación de Propietario
    - Comparación del UUID autenticado con el owner del objeto en Storage
    - Aplicable a cualquier bucket que requiera estas restricciones
    - Seguridad granular a nivel de archivo individual

  3. Funcionalidad
    - UPDATE permite modificar metadatos del archivo (nombre, etc.)
    - DELETE permite eliminar completamente el archivo
    - Ambas operaciones requieren autenticación y propiedad
*/

-- Política para permitir UPDATE solo al propietario del archivo
CREATE POLICY "Solo propietarios pueden actualizar archivos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (auth.uid() = owner);

-- Política para permitir DELETE solo al propietario del archivo
CREATE POLICY "Solo propietarios pueden eliminar archivos"
ON storage.objects
FOR DELETE
TO authenticated
USING (auth.uid() = owner);

-- Comentarios para documentación
COMMENT ON POLICY "Solo propietarios pueden actualizar archivos" ON storage.objects IS 'Permite UPDATE solo cuando auth.uid() coincide con el owner del archivo';
COMMENT ON POLICY "Solo propietarios pueden eliminar archivos" ON storage.objects IS 'Permite DELETE solo cuando auth.uid() coincide con el owner del archivo';