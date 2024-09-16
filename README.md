How to use: 

1. Clone the project
2. Run ```npm install```
3. To convert youtube video to mp3 run:
```node yt-video-convert-to-mp3.js "YOUTUBE_VIDEO_URL_HERE___FORMAT_EQUAL_https://www.youtube.com/watch?v=UJZ2GXfxY5A"```
4. After converting the video to mp3, you can find the mp3 file in the output_audios folder
5. To convert generated audio to text run: 
```node audio-to-text-file.js file_name_here_from_output_audios_folder.mp3```
6. To convert Video to text run:
```node video-to-text.js YOUTUBE_VIDEO_URL_HERE__https://www.youtube.com/watch?v=UJZ2GXfxY5A```
7. To get API path run:
```npm run dev```

Note: API path is : http://localhost:3000/video-to-text (POST) 
```json
{
    "video_url": "https://www.youtube.com/watch?v=UJZ2GXfxY5A",
    "delete_audio_file": true,
    "delete_text_file": true
}
```

Response:
```json
{
    "transcription": "your transcription here"
}
```