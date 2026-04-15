const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
    name: "music",
    version: "2.0.1",
    hasPermssion: 0,
    credits: "Shaan Khan",
    description: "Download Audio or Video (Add 'video' at the end for video)",
    commandCategory: "Media",
    usages: "[name] or [name] video",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    // 🔑 API KEY
    const PRIYANSHU_API_KEY = "apim_gqO3C3DQwoVSU3mZK5GwcmU-rWRvypr0XLfire-TeC4"; 

    if (!args.length) {
        return api.sendMessage("❌ Please enter a song name or YouTube URL.", threadID, messageID);
    }

    let input = args.join(" ");
    let isVideo = false;

    // Check if user wants video
    if (input.toLowerCase().endsWith(" video")) {
        isVideo = true;
        input = input.slice(0, -6).trim(); 
    }

    const cacheDir = path.join(__dirname, "cache");
    const extension = isVideo ? "mp4" : "mp3";
    const fileName = `${Date.now()}.${extension}`;
    const cachePath = path.join(cacheDir, fileName);

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    let processingMsg;
    try {
        api.setMessageReaction("⌛", messageID, (err) => {}, true);

        // Bilkul pehle jaisa simple message
        processingMsg = await api.sendMessage("✅ Apki Request Jari Hai Please Wait...", threadID);

        // 1. YouTube Search
        const searchResult = await ytSearch(input);
        if (!searchResult || !searchResult.videos.length) {
            api.setMessageReaction("❌", messageID, (err) => {}, true);
            if (processingMsg) api.unsendMessage(processingMsg.messageID);
            return api.sendMessage("❌ Song/Video not found.", threadID, messageID);
        }
        const video = searchResult.videos[0];
        const videoUrl = video.url;

        // 2. Calling API
        const apiUrl = `https://priyanshuapi.xyz/api/runner/youtube-downloader-v2/download`;
        const payload = {
            url: videoUrl,
            format: isVideo ? "mp4" : "mp3",
            quality: isVideo ? "360" : "320"
        };

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${PRIYANSHU_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        const data = response.data.data;
        if (!data || !data.downloadUrl) {
            throw new Error("Download link not found.");
        }

        // 3. Formatting Message (Custom Footer)
        const infoMsg = `🖤 𝗧𝗶𝘁𝗹𝗲: ${video.title}\n\n⏱️ 𝗗𝘂𝗿𝗮𝘁𝗶𝗼𝗻: ${video.timestamp}\n\n👤 𝗔𝗿𝘁𝗶𝘀𝘁: ${video.author.name}\n\n»»𝑶𝑾𝑵𝑬𝑹««★™ »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««\n🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰     👉 ${isVideo ? "VIDEO" : "SONG"}`;

        // 4. Download Stream
        const writer = fs.createWriteStream(cachePath);
        const streamResponse = await axios({
            url: data.downloadUrl,
            method: 'GET',
            responseType: 'stream'
        });

        streamResponse.data.pipe(writer);

        writer.on("finish", async () => {
            const stats = fs.statSync(cachePath);
            const fileSizeInMB = stats.size / (1024 * 1024);

            if (fileSizeInMB > 48) {
                api.setMessageReaction("❌", messageID, (err) => {}, true);
                if (processingMsg) api.unsendMessage(processingMsg.messageID);
                api.sendMessage(`⚠️ File size (${fileSizeInMB.toFixed(2)}MB) is too large.`, threadID, messageID);
                return fs.unlinkSync(cachePath);
            }

            // 5. Send File with Body
            api.sendMessage({
                body: infoMsg,
                attachment: fs.createReadStream(cachePath)
            }, threadID, (err) => {
                if (!err) api.setMessageReaction("✅", messageID, (err) => {}, true);
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                if (processingMsg) api.unsendMessage(processingMsg.messageID);
            }, messageID);
        });

        writer.on("error", (err) => { throw err; });

    } catch (error) {
        console.error(error);
        api.setMessageReaction("❌", messageID, (err) => {}, true);
        if (processingMsg) api.unsendMessage(processingMsg.messageID);
        api.sendMessage(`❌ Failed: ${error.message}`, threadID, messageID);
    }
};
