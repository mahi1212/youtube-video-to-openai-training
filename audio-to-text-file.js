const fs = require('fs');
const path = require('path');
const OpenAI = require('openai'); // Make sure to initialize OpenAI client with your API key
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

async function main() {
    const audioFileName = process.argv[2]; // Get the audio file name from command line

    if (!audioFileName) {
        console.error("Please provide the audio file name.");
        process.exit(1);
    }

    const audioFilePath = path.join(__dirname, 'output_audios', audioFileName);

    // Check if the file exists
    if (!fs.existsSync(audioFilePath)) {
        console.error(`Audio file not found: ${audioFilePath}`);
        process.exit(1);
    }

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: "whisper-1",
        });

        // Ensure the 'output_texts' folder exists
        const textFolder = path.join(__dirname, 'output_texts');
        ensureDirectoryExistence(textFolder);

        // Save transcription to a text file inside the 'output_texts' folder
        const transcriptionFilePath = path.join(textFolder, `${path.parse(audioFileName).name}.txt`);
        fs.writeFileSync(transcriptionFilePath, transcription.text);

        console.log("Transcription saved at:", transcriptionFilePath);
    } catch (error) {
        console.error("Error during transcription:", error);
    }
}

// Run the function
main();
