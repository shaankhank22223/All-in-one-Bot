const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");
const https = require("https");

module.exports = {
  config: {
    name: "music",
    version: "1.0.3",
    hasPermssion: 0,
    credits: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    description: "Download YouTube song from keyword search and link",
    commandCategory: "Media",
    usages: "[songName] [type]",
    cooldowns: 5,
    dependencies: {
      "axios": "",
      "yt-search": "",
    },
  },

  run: async function ({ api, event, args }) {
    let songName, type;

    // Type checking (audio ya video)
    if (
      args.length > 1 &&
      (args[args.length - 1] === "audio" || args[args.length - 1] === "video")
    ) {
      type = args.pop().toLowerCase();
      songName = args.join(" ");
    } else {
      songName = args.join(" ");
      type = "audio";
    }

    if (!songName) return api.sendMessage("⚠️ Please provide a song name or link!", event.threadID, event.messageID);

    const processingMessage = await api.sendMessage(
      "✅ Apki Request jari Hai Please wait...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // 1. YouTube Search Logic
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No results found for your search query.");
      }

      const topResult = searchResults.videos[0];
      const videoUrl = topResult.url;

      // 2. Uzair Rajput API Configuration
      // Video ke liye alag endpoint aur audio ke liye alag
      let apiUrl;
      if (type === "video") {
        apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(videoUrl)}`;
      } else {
        apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
      }

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // 3. API Call
      const downloadResponse = await axios.get(apiUrl);
      
      // API response se download link nikalna (result handle karna)
      const downloadUrl = downloadResponse.data.result?.download_url || downloadResponse.data.result?.link || downloadResponse.data.link;

      if (!downloadUrl) throw new Error("Could not fetch download link from the API.");

      // 4. File Path and Cache Handling
      const safeTitle = topResult.title.replace(/[^a-zA-Z0-9 \-_]/g, ""); 
      const filename = `${safeTitle}_${Date.now()}.${type === "audio" ? "mp3" : "mp4"}`;
      const downloadDir = path.join(__dirname, "cache");
      const downloadPath = path.join(downloadDir, filename);

      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // 5. Downloading the File
      const file = fs.createWriteStream(downloadPath);

      await new Promise((resolve, reject) => {
        https.get(downloadUrl, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on("finish", () => {
              file.close(resolve);
            });
          } else {
            reject(new Error(`Server returned ${response.statusCode}`));
          }
        }).on("error", (error) => {
          if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
          reject(error);
        });
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // 6. Sending the Attachment
      await api.sendMessage(
        {
          attachment: fs.createReadStream(downloadPath),
          body: `🖤 Title: ${topResult.title}\n\n  »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««\n          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰💞  ${
            type === "audio" ? "audio" : "video"
          } 🎧:`,
        },
        event.threadID,
        () => {
          // Cleanup
          if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );

    } catch (error) {
      console.error(error);
      api.sendMessage(
        `❌ Error: ${error.message}`,
        event.threadID,
        event.messageID
      );
      api.unsendMessage(processingMessage.messageID);
    }
  },
};
