# Video Upload Setup Instructions

## 1. Configure Supabase Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project dashboard under Settings > API.

## 2. Set up Supabase Project

### Initialize Supabase (if not already done):
```bash
npm run supabase init
```

### Start Supabase locally:
```bash
npm run supabase start
```

### Deploy migrations:
```bash
npm run supabase db push
```

### Deploy Edge Functions:
```bash
npm run supabase functions deploy video-processor
```

## 3. Configure Authentication

In your Supabase dashboard:

1. Go to Authentication > Providers
2. Enable Google OAuth provider
3. Add your Google OAuth credentials
4. Set the redirect URL to: `http://localhost:5173` (for development)

## 4. Install Dependencies and Run

```bash
npm install
npm run dev
```

## 5. How it Works

### Video Upload Flow:

1. **User Authentication**: User signs in with Google OAuth
2. **File Selection**: User selects a video file (validated for type and size)
3. **Upload to Storage**: Video is uploaded to Supabase Storage bucket `videos` with path `{user_id}/{filename}`
4. **Edge Function Call**: After successful upload, the `video-processor` Edge Function is called with:
   - `owner_id`: The user's UUID
   - `video_path`: The storage path of the uploaded video
5. **Database Record**: The Edge Function creates a record in the `videos` table
6. **User Feedback**: Success/error messages are displayed to the user

### File Structure:
- Videos are organized by user ID in the storage bucket
- Each video gets a unique filename with timestamp and random string
- Maximum file size: 100MB
- Supported formats: Any video file type

### Security:
- Row Level Security (RLS) is enabled on all tables
- Users can only upload to their own folder in storage
- Videos are publicly readable but only deletable by the owner
- Authentication is required for all upload operations

## 6. Database Schema

### `profiles` table:
- User profiles with avatar, banner, and settings
- Linked to auth.users via UUID

### `videos` table:
- Video metadata including storage path, description, and tags
- Linked to profiles via uploader_id

### Storage bucket `videos`:
- Organized by user ID folders
- Public read access
- Authenticated write access

## 7. Edge Function

The `video-processor` Edge Function:
- Receives `owner_id` and `video_path` from the React app
- Downloads the video from storage for processing
- Creates database records
- Can be extended to generate thumbnails, transcode videos, etc.

## Troubleshooting

### Common Issues:

1. **Environment Variables**: Make sure `.env` file exists and has correct Supabase credentials
2. **CORS**: The Edge Function includes CORS headers for cross-origin requests
3. **Storage Policies**: Ensure storage policies allow authenticated uploads
4. **RLS Policies**: Check that RLS policies allow users to insert their own videos
5. **File Size**: Default limit is 100MB, adjust in `VideoUpload.tsx` if needed

### Testing:
- Check browser console for any errors
- Verify Supabase logs in the dashboard
- Test with small video files first
