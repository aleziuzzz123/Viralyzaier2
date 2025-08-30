# Placeholder Files for Missing Assets

The app is missing these files and getting 400 errors:

## Missing Files:
- `feature_studio.jpg`
- `testimonial_01.jpg` 
- `testimonial_02.jpg`
- `testimonial_03.jpg`
- `promo_video.mp4`

## Quick Solution - Create Placeholders:

### For Images (JPG):
1. Go to: https://picsum.photos/400/300
2. Right-click → "Save image as"
3. Save as each filename above
4. Upload to Supabase "assets" bucket

### For Video (MP4):
1. Go to: https://sample-videos.com/
2. Download any small MP4 file
3. Rename to `promo_video.mp4`
4. Upload to Supabase "assets" bucket

## Upload Steps:
1. Go to Supabase Dashboard
2. Storage → assets bucket
3. Click "Upload files"
4. Select your placeholder files
5. Upload

This will fix the 400 errors and let the app load properly!
