const fs = require('fs');
const path = require('path');
const OpenAI = require('openai'); // Make sure to initialize OpenAI client with your API key
const ytdl = require('@distube/ytdl-core');
const sanitizeFilename = require('sanitize-filename');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Ensure the directory exists, if not create it
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Function to sanitize and ensure valid filenames
function generateValidFilename(title, extension) {
    const sanitizedTitle = sanitizeFilename(title).replace(/\s+/g, '_');
    return `${sanitizedTitle}.${extension}`;
}

// Download and convert audio to MP3
async function downloadAndConvertAudio(videoUrl, downloadPath) {
    const video_identifier = `[${videoUrl.replace("https://www.youtube.com/watch?v=", "")}] `;

    try {
        console.log(video_identifier + "Searching video information...");
        const info = await ytdl.getInfo(videoUrl);

        if (info.videoDetails) {
            const originalTitle = info.videoDetails.title;
            const filename = generateValidFilename(originalTitle, 'mp3');
            const finalFilePath = path.join(downloadPath, filename);

            console.log(video_identifier + "Downloading video audio...");
            const audioStream = await ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });

            // Ensure the download directory exists
            ensureDirectoryExistence(downloadPath);

            console.info(video_identifier + "Writing audio file as '" + finalFilePath + "'..");
            const wstream = fs.createWriteStream(finalFilePath);
            audioStream.pipe(wstream);

            return new Promise((resolve, reject) => {
                wstream.on("finish", () => {
                    console.log(video_identifier + "Download and conversion to MP3 finished!");
                    resolve(finalFilePath);
                });

                wstream.on("error", (err) => {
                    console.error(video_identifier + "Error writing audio stream:", err);
                    reject(err);
                });
            });
        } else {
            throw new Error(videoUrl + " no video details found.");
        }
    } catch (error) {
        console.error("Error during audio download:", error);
        throw error;
    }
}

// Transcribe audio file using OpenAI Whisper API
async function transcribeAudio(audioFilePath, outputFolder) {
    try {
        console.log("Transcribing audio file:", audioFilePath);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: "whisper-1",
        });

        // Ensure the output folder exists
        ensureDirectoryExistence(outputFolder);

        // Save transcription to a text file inside the output folder
        const transcriptionFilePath = path.join(outputFolder, `${path.parse(audioFilePath).name}.txt`);
        fs.writeFileSync(transcriptionFilePath, transcription.text);

        console.log("Transcription saved at:", transcriptionFilePath);
        return transcriptionFilePath;
    } catch (error) {
        console.error("Error during transcription:", error);
        throw error;
    }
}

// Main function to handle both downloading and transcribing
async function main() {
    const videoUrl = process.argv[2]; // Get the YouTube video URL from command line

    if (!videoUrl) {
        console.error("Please provide a YouTube video URL.");
        process.exit(1);
    }

    const downloadPath = path.join(__dirname, 'output_audios');
    const transcriptionPath = path.join(__dirname, 'output_texts');

    try {
        // Step 1: Download and convert the YouTube video audio to MP3
        const audioFilePath = await downloadAndConvertAudio(videoUrl, downloadPath);

        // Step 2: Transcribe the audio file and save it as a text file
        const transcriptionFilePath = await transcribeAudio(audioFilePath, transcriptionPath);
        // if you want to delete the audio file after transcription, uncomment the line below
        // fs.unlinkSync(audioFilePath); // console.log(`Audio file deleted: ${audioFilePath}`);

        console.log("Process completed successfully!");
        console.log(`Transcription saved at: ${transcriptionFilePath}`);
    } catch (error) {
        console.error("Error during the process:", error);
    }
}

// Run the main function
main();
