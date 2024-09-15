// index.js
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const sanitizeFilename = require('sanitize-filename');

// Ensure the directory exists, if not create it
function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
}

// Function to sanitize and ensure valid filenames
function generateValidFilename(title, extension) {
    const sanitizedTitle = sanitizeFilename(title).replace(/\s+/g, '_');
    return `${sanitizedTitle}.${extension}`;
}

dl_and_convert_audio = (videoUrl, settings) => {
    const dl_detail = {};
    const video_identifier = `[${videoUrl.replace("https://www.youtube.com/watch?v=", "")}] `;

    console.log(video_identifier + "Download starting..");

    return new Promise(async (resolve, reject) => {
        if (!videoUrl.startsWith("https://www.youtube.com/watch?v=")) { 
            return reject(videoUrl + " is not valid"); 
        }

        console.log(video_identifier + "Searching video information..");
        const info = await ytdl.getInfo(videoUrl).catch(err => reject(err));

        if (info.videoDetails) {
            const originalTitle = info.videoDetails.title;
            const filename = generateValidFilename(originalTitle, settings.convert_type);

            console.log(video_identifier + "Downloading video audio..");
            const audioStream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });

            // Ensure the directory exists
            ensureDirectoryExistence(path.join(settings.path, filename));

            const finalFilePath = path.join(settings.path, filename);
            console.info(video_identifier + "Writing audio file as '" + finalFilePath + "'..");

            const wstream = fs.createWriteStream(finalFilePath);

            // Log if there are issues with the audio stream
            audioStream.on('error', (err) => {
                console.error(video_identifier + "Error with audio stream:", err);
                reject(err);
            });

            // Check if the write stream has any errors
            wstream.on('error', (err) => {
                console.error(video_identifier + "Error writing audio file:", err);
                reject(err);
            });

            audioStream.pipe(wstream);

            wstream.on("finish", () => {
                console.log(video_identifier + "Download and conversion to MP3 finished!");
                dl_detail.videoDetails = info.videoDetails;
                dl_detail.savedAs = finalFilePath;
                resolve(dl_detail);
            });
        } else {
            reject(videoUrl + " no video details found..");
        }
    });
}

downloadAudio = (videoUrl, settings) => {
    const RETURN_INFO = {};
    settings = settings || {};
    settings.path = settings.path || "";
    settings.convert_type = settings.convert_type || "mp3";

    RETURN_INFO.converted_file = [];
    RETURN_INFO.settings = settings;

    return new Promise(async (resolve, reject) => {
        if (typeof videoUrl === "string") {
            await dl_and_convert_audio(videoUrl, settings)
                .then(detail => {
                    RETURN_INFO.converted_file.push(detail);
                })
                .catch(err => reject(err));
        } else if (typeof videoUrl === "object") {
            for (const key in videoUrl) {
                const url = videoUrl[key];
                await dl_and_convert_audio(url, settings)
                    .then(detail => {
                        RETURN_INFO.converted_file.push(detail);
                    })
                    .catch(err => reject(err));
            }
        }

        console.log("All downloads finished with success!");
        resolve(RETURN_INFO);
    });
}

module.exports.downloadAudio = downloadAudio;

// Running the function using command-line arguments
const url = process.argv[2];
const settings = { path: "output_audios/", convert_type: "mp3" };

if (!url) {
    console.error("Please provide a YouTube URL.");
    process.exit(1);
}

downloadAudio(url, settings)
    .then(response => console.log("Download complete:", response))
    .catch(err => console.error("Error during download:", err));
