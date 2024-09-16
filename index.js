const express = require('express');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const OpenAI = require('openai'); // Make sure to initialize OpenAI client with your API key
require('dotenv').config();

const app = express();
app.use(express.json()); // To parse JSON request body

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Ensure the directory exists, if not create it
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Helper to delete a file
function deleteFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

// Download YouTube audio and return the audio file path
async function downloadAudioFromYoutube(videoUrl, outputPath) {
    const info = await ytdl.getInfo(videoUrl);
    const audioStream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });
    const sanitizedTitle = info.videoDetails.title.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
    const filePath = path.join(outputPath, `${sanitizedTitle}.mp3`);

    const wstream = fs.createWriteStream(filePath);
    audioStream.pipe(wstream);

    return new Promise((resolve, reject) => {
        wstream.on('finish', () => resolve(filePath));
        wstream.on('error', reject);
    });
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(audioFilePath) {
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
    });

    return transcription.text;
}

// API to convert YouTube video to text
app.post('/video-to-text', async (req, res) => {
    const { video_url, delete_audio_file, delete_text_file } = req.body;

    if (!video_url) {
        return res.status(400).json({ error: 'video_url is required' });
    }

    const outputAudioDir = path.join(__dirname, 'output_audios');
    const outputTextDir = path.join(__dirname, 'output_texts');

    // Ensure directories exist
    ensureDirectoryExistence(outputAudioDir);
    ensureDirectoryExistence(outputTextDir);

    try {
        // Download YouTube audio
        const audioFilePath = await downloadAudioFromYoutube(video_url, outputAudioDir);
        console.log(`Audio downloaded at: ${audioFilePath}`);

        // Transcribe audio
        const transcriptionText = await transcribeAudio(audioFilePath);
        console.log('Transcription completed.');

        // Save transcription to text file
        const transcriptionFileName = path.basename(audioFilePath, '.mp3') + '.txt';
        const transcriptionFilePath = path.join(outputTextDir, transcriptionFileName);
        fs.writeFileSync(transcriptionFilePath, transcriptionText);

        // Handle file deletion based on flags
        if (delete_audio_file) {
            deleteFile(audioFilePath);
        }
        if (delete_text_file) {
            deleteFile(transcriptionFilePath);
        }

        // Return transcription text
        return res.json({ transcription: transcriptionText });
    } catch (error) {
        console.error("Error during processing:", error);
        return res.status(500).json({ error: 'Failed to process video.' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
