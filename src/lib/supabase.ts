import { createClient } from '@supabase/supabase-js'

// These should be replaced with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  animated_avatar_url?: string
  banner_url?: string
  dynamic_banner_url?: string
  profile_music_url?: string
  profile_settings?: Record<string, any>
  updated_at: string
}

export interface Video {
  id: number
  created_at: string
  uploader_id: string
  description?: string
  storage_path: string
  tags: string[]
}
