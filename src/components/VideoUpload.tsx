import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

interface VideoUploadProps {
  userId: string
}

export const VideoUpload: React.FC<VideoUploadProps> = ({ userId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setMessage('Por favor selecciona un archivo de video válido')
        return
      }
      
      // Validate file size (e.g., max 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        setMessage('El archivo es demasiado grande. Máximo 100MB')
        return
      }
      
      setSelectedFile(file)
      setMessage('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !userId) {
      setMessage('Por favor selecciona un archivo de video')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setMessage('')

    try {
      // Generate unique filename with user folder structure
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Error al subir el video: ${uploadError.message}`)
      }

      setUploadProgress(50)
      setMessage('Video subido exitosamente. Procesando...')

      // Call the video-processor Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('video-processor', {
        body: {
          owner_id: userId,
          video_path: filePath
        }
      })

      if (functionError) {
        throw new Error(`Error al procesar el video: ${functionError.message}`)
      }

      setUploadProgress(100)
      setMessage('¡Video publicado exitosamente!')

      // Reset form
      setSelectedFile(null)
      setDescription('')
      setTags('')
      
      // Reset file input
      const fileInput = document.getElementById('video-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }

    } catch (error) {
      console.error('Error during upload:', error)
      setMessage(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => setMessage(''), 5000) // Clear message after 5 seconds
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Subir Video</h2>
      
      {/* File Upload */}
      <div className="mb-6">
        <label htmlFor="video-file" className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Video
        </label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600">
            Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Descripción (opcional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isUploading}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          placeholder="Describe tu video..."
        />
      </div>

      {/* Tags */}
      <div className="mb-6">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
          Tags (opcional)
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={isUploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          placeholder="tag1, tag2, tag3..."
        />
        <p className="mt-1 text-xs text-gray-500">Separa los tags con comas</p>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.includes('Error') || message.includes('error') 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Publish Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? 'Publicando...' : 'Publicar'}
      </button>
    </div>
  )
}
