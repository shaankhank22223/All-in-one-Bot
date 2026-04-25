const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");
const https = require("https");

module.exports = {
  config: {
    name: "music",
    version: "1.0.6",
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Download YouTube song with Uzair API Fix",
    commandCategory: "Media",
    usages: "[songName] [audio/video]",
    cooldowns: 5,
    dependencies: {
      "axios": "",
      "yt-search": ""
    },
  },

  run: async function ({ api, event, args }) {
    let songName, type;

    if (args.length > 1 && (args[args.length - 1] === "audio" || args[args.length - 1] === "video")) {
      type = args.pop().toLowerCase();
      songName = args.join(" ");
    } else {
      songName = args.join(" ");
      type = "audio";
    }

    if (!songName) return api.sendMessage("⚠️ Please provide a song name!", event.threadID, event.messageID);

    const processingMessage = await api.sendMessage("✅ Apki Request jari Hai Please wait...", event.threadID, null, event.messageID);

    try {
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) throw new Error("No results found.");

      const topResult = searchResults.videos[0];
      const videoUrl = topResult.url;

      // Uzair Rajput API Endpoints
      let apiUrl = type === "video" 
        ? `https://uzairrajputapis.qzz.io/api/downloader/youtube` 
        : `https://uzairrajputapis.qzz.io/api/downloader/ytmp3`;

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // 405 Error Fix: Kuch APIs direct GET se block hoti hain, isliye hum params bhej rahe hain
      const downloadResponse = await axios.get(apiUrl, {
        params: { url: videoUrl }
      });

      // Response structure check
      const result = downloadResponse.data.result;
      const downloadUrl = result?.download_url || result?.link || downloadResponse.data.link;

      if (!downloadUrl) throw new Error("API did not return a download link.");

      const ext = type === "audio" ? "mp3" : "mp4";
      const filename = `${Date.now()}.${ext}`;
      const downloadPath = path.join(__dirname, "cache", filename);

      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
      }

      const file = fs.createWriteStream(downloadPath);
      
      // Downloading the file
      https.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          return api.sendMessage("❌ Download link expired or invalid.", event.threadID);
        }
        
        response.pipe(file);
        file.on("finish", async () => {
          file.close();
          api.setMessageReaction("✅", event.messageID, () => {}, true);

          await api.sendMessage({
            body: `🖤 Title: ${topResult.title}\n\n  »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««\n          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰💞  ${type} 🎧:`,
            attachment: fs.createReadStream(downloadPath)
          }, event.threadID, () => {
            if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
            api.unsendMessage(processingMessage.messageID);
          }, event.messageID);
        });
      }).on("error", (err) => { throw err; });

    } catch (error) {
      console.error(error);
      // Agar 405 phir bhi aaye, toh link structure badal dete hain
      api.sendMessage(`❌ Error: ${error.message}\nTip: Check if API is online.`, event.threadID, event.messageID);
      api.unsendMessage(processingMessage.messageID);
    }
  },
};
