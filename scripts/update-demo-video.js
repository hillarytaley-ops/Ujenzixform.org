#!/usr/bin/env node

/**
 * UjenziPro Demo Video Update Script
 * 
 * This script helps you quickly update the demo video configuration
 * when you have your actual video ready.
 * 
 * Usage:
 * node scripts/update-demo-video.js --youtube YOUR_VIDEO_ID
 * node scripts/update-demo-video.js --self-hosted /videos/demo.mp4
 * node scripts/update-demo-video.js --placeholder
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--youtube':
      config.type = 'youtube';
      config.videoId = args[i + 1];
      i++;
      break;
    case '--self-hosted':
      config.type = 'self-hosted';
      config.videoUrl = args[i + 1];
      i++;
      break;
    case '--placeholder':
      config.type = 'placeholder';
      break;
    case '--title':
      config.title = args[i + 1];
      i++;
      break;
    case '--description':
      config.description = args[i + 1];
      i++;
      break;
    case '--thumbnail':
      config.thumbnail = args[i + 1];
      i++;
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
🎬 UjenziPro Demo Video Update Script

Usage:
  node scripts/update-demo-video.js [options]

Options:
  --youtube VIDEO_ID          Use YouTube video with specified ID
  --self-hosted VIDEO_URL     Use self-hosted video at specified URL
  --placeholder               Use placeholder until video is ready
  --title "Title"             Set video title (optional)
  --description "Desc"        Set video description (optional)
  --thumbnail PATH            Set thumbnail path (optional)
  --help                      Show this help message

Examples:
  # Use YouTube video
  node scripts/update-demo-video.js --youtube "abc123xyz"
  
  # Use self-hosted video
  node scripts/update-demo-video.js --self-hosted "/videos/ujenzipro-demo.mp4"
  
  # Use placeholder
  node scripts/update-demo-video.js --placeholder
  
  # With custom title and description
  node scripts/update-demo-video.js --youtube "abc123" --title "New Demo" --description "Updated demo video"
`);
}

function updateVideoConfig() {
  const indexPath = path.join(__dirname, '../src/pages/Index.tsx');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Error: Index.tsx not found at', indexPath);
    process.exit(1);
  }
  
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Default values
  const title = config.title || 'UjenziPro Platform Demo';
  const description = config.description || 'See how easy it is to connect, quote, and build across Kenya - from Nairobi to Mombasa, Kisumu to Eldoret';
  const thumbnail = config.thumbnail || '/ujenzipro-demo-thumbnail.svg';
  
  // Find and replace the VideoSection component
  const videoSectionRegex = /<VideoSection\s+[^>]*\/>/;
  
  let newVideoSection;
  
  switch (config.type) {
    case 'youtube':
      newVideoSection = `<VideoSection 
                videoId="${config.videoId}"
                useYouTube={true}
                thumbnail="${thumbnail}"
                title="${title}"
                description="${description}"
              />`;
      break;
      
    case 'self-hosted':
      newVideoSection = `<VideoSection 
                videoUrl="${config.videoUrl}"
                useYouTube={false}
                thumbnail="${thumbnail}"
                title="${title}"
                description="${description}"
              />`;
      break;
      
    case 'placeholder':
      newVideoSection = `<VideoSection 
                videoId=""
                useYouTube={false}
                thumbnail="${thumbnail}"
                title="${title}"
                description="${description}"
              />`;
      break;
      
    default:
      console.error('❌ Error: Please specify video type (--youtube, --self-hosted, or --placeholder)');
      showHelp();
      process.exit(1);
  }
  
  // Replace the VideoSection component
  const updatedContent = content.replace(videoSectionRegex, newVideoSection);
  
  if (updatedContent === content) {
    console.error('❌ Error: Could not find VideoSection component to update');
    process.exit(1);
  }
  
  // Write the updated content back to the file
  fs.writeFileSync(indexPath, updatedContent, 'utf8');
  
  console.log('✅ Successfully updated demo video configuration!');
  console.log(`📹 Type: ${config.type}`);
  if (config.videoId) console.log(`🆔 Video ID: ${config.videoId}`);
  if (config.videoUrl) console.log(`🔗 Video URL: ${config.videoUrl}`);
  console.log(`🖼️ Thumbnail: ${thumbnail}`);
  console.log(`📝 Title: ${title}`);
  console.log(`📄 Description: ${description}`);
}

function validateYouTubeId(videoId) {
  // Basic YouTube video ID validation
  const youtubeRegex = /^[a-zA-Z0-9_-]{11}$/;
  return youtubeRegex.test(videoId);
}

function validateVideoUrl(url) {
  // Basic URL validation
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith('/') && url.includes('.mp4');
  }
}

// Main execution
if (args.length === 0) {
  console.log('❌ No arguments provided. Use --help for usage information.');
  process.exit(1);
}

// Validate inputs
if (config.type === 'youtube' && !validateYouTubeId(config.videoId)) {
  console.error('❌ Error: Invalid YouTube video ID format');
  process.exit(1);
}

if (config.type === 'self-hosted' && !validateVideoUrl(config.videoUrl)) {
  console.error('❌ Error: Invalid video URL format');
  process.exit(1);
}

// Update the configuration
updateVideoConfig();

// Additional setup suggestions
console.log('\n📋 Next Steps:');
switch (config.type) {
  case 'youtube':
    console.log('1. Ensure your YouTube video is public or unlisted');
    console.log('2. Test the video playback in your browser');
    console.log('3. Consider adding captions for accessibility');
    break;
    
  case 'self-hosted':
    console.log('1. Ensure your video file is in the public directory');
    console.log('2. Test video loading across different devices');
    console.log('3. Consider multiple quality versions for different connections');
    break;
    
  case 'placeholder':
    console.log('1. Create your demo video using the provided script and storyboard');
    console.log('2. Upload to your preferred hosting platform');
    console.log('3. Run this script again with your video details');
    break;
}

console.log('\n🚀 Your UjenziPro demo video is ready to go!');










