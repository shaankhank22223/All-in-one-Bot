const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");
const https = require("https");

module.exports = {
  config: {
    name: "music",
    version: "1.0.7",
    hasPermssion: 0,
    credits: "Shaan Khan",
    description: "Download YouTube song with Uzair API Fix (405 Fixed)",
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

      // API Endpoints as per your links
      const apiBase = type === "video" 
        ? `https://uzairrajputapis.qzz.io/api/downloader/youtube` 
        : `https://uzairrajputapis.qzz.io/api/downloader/ytmp3`;

      // 405 Fix: Constructing full URL with properly encoded query
      const apiUrl = `${apiBase}?url=${encodeURIComponent(videoUrl)}`;

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // Fetching with custom User-Agent to avoid 405 Method Not Allowed
      const downloadResponse = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
        }
      });

      // API Response logic
      const data = downloadResponse.data;
      const downloadUrl = data.result?.download_url || data.result?.link || data.link;

      if (!downloadUrl) throw new Error("API se download link nahi mil saki.");

      const ext = type === "audio" ? "mp3" : "mp4";
      const downloadPath = path.join(__dirname, "cache", `${Date.now()}.${ext}`);

      if (!fs.existsSync(path.join(__dirname, "cache"))) {
        fs.mkdirSync(path.join(__dirname, "cache"), { recursive: true });
      }

      const file = fs.createWriteStream(downloadPath);
      
      https.get(downloadUrl, (res) => {
        if (res.statusCode !== 200) {
          throw new Error("Download server responded with " + res.statusCode);
        }
        res.pipe(file);
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
      api.sendMessage(`❌ Error: ${error.response?.status === 405 ? "API method not allowed (405). Uzair API may require POST or Private Key." : error.message}`, event.threadID, event.messageID);
      api.unsendMessage(processingMessage.messageID);
    }
  },
};
