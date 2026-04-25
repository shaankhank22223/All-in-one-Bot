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
    credits: "Shaan",
    description: "Download YouTube song from keyword search and link",
    commandCategory: "Media",
    usages: "[songName] [type]",
    cooldowns: 5,
    dependencies: {
      "node-fetch": "",
      "yt-search": "",
    },
  },

  run: async function ({ api, event, args }) {
    let songName, type;

    if (
      args.length > 1 &&
      (args[args.length - 1] === "audio" || args[args.length - 1] === "video")
    ) {
      type = args.pop();
      songName = args.join(" ");
    } else {
      songName = args.join(" ");
      type = "audio";
    }

    if (!songName) return api.sendMessage("Please provide a song name!", event.threadID, event.messageID);

    const processingMessage = await api.sendMessage(
      "✅  Apki Request  jari Hai Please wait...",
      event.threadID,
      null,
      event.messageID
    );

    try {
      // Search for the song on YouTube
      const searchResults = await ytSearch(songName);
      if (!searchResults || !searchResults.videos.length) {
        throw new Error("No results found for your search query.");
      }

      const topResult = searchResults.videos[0];
      const videoUrl = topResult.url;

      // --- Nayi API Logic ---
      let apiUrl;
      if (type === "video") {
        apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(videoUrl)}`;
      } else {
        apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
      }

      api.setMessageReaction("⌛", event.messageID, () => {}, true);

      // Get the direct download URL from the API
      const downloadResponse = await axios.get(apiUrl);
      
      // Uzair Rajput API typically returns 'result' object
      const downloadUrl = downloadResponse.data.result?.download_url || downloadResponse.data.result?.link;

      if (!downloadUrl) throw new Error("Could not fetch download link from API.");

      // Set the filename
      const safeTitle = topResult.title.replace(/[^a-zA-Z0-9 \-_]/g, ""); 
      const filename = `${safeTitle}.${type === "audio" ? "mp3" : "mp4"}`;
      const downloadDir = path.join(__dirname, "cache");
      const downloadPath = path.join(downloadDir, filename);

      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Download the file
      const file = fs.createWriteStream(downloadPath);

      await new Promise((resolve, reject) => {
        https.get(downloadUrl, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on("finish", () => {
              file.close(resolve);
            });
          } else {
            reject(new Error(`Failed to download. Status: ${response.statusCode}`));
          }
        }).on("error", (error) => {
          if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
          reject(error);
        });
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Send the file
      await api.sendMessage(
        {
          attachment: fs.createReadStream(downloadPath),
          body: `🖤 Title: ${topResult.title}\n\n  »»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««\n          🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰💞  ${
            type === "audio" ? "audio" : "video"
          } 🎧:`,
        },
        event.threadID,
        () => {
          if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
          api.unsendMessage(processingMessage.messageID);
        },
        event.messageID
      );
    } catch (error) {
      console.error(error);
      api.sendMessage(
        `Failed to download song: ${error.message}`,
        event.threadID,
        event.messageID
      );
      api.unsendMessage(processingMessage.messageID);
    }
  },
};
