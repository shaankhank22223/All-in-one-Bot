const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");
const https = require("https");

module.exports.config = {
  name: "music", // File name logic ke mutabiq name music kar diya gaya hai
  version: "3.0.2",
  hasPermission: 0,
  credits: "Shaan Khan", // Credits update kar diye gaye hain
  description: "Smart music player using Uzair Rajput APIs",
  usePrefix: false,
  commandCategory: "Music",
  cooldowns: 10
};

const triggerWords = ["pika", "bot", "shankar"];
const keywordMatchers = ["gana", "music", "song", "suna", "sunao", "play", "chalao", "lagao", "video"];

module.exports.handleEvent = async function ({ api, event }) {
  let message = event.body?.toLowerCase();
  if (!message) return;

  const foundTrigger = triggerWords.find(trigger => message.startsWith(trigger));
  if (!foundTrigger) return;

  let content = message.slice(foundTrigger.length).trim();
  if (!content) return;

  const words = content.split(/\s+/);
  const keywordIndex = words.findIndex(word => keywordMatchers.includes(word));
  if (keywordIndex === -1 || keywordIndex === words.length - 1) return;

  const isVideo = message.includes("video");
  let possibleSongWords = words.slice(keywordIndex + 1);
  const songName = possibleSongWords.join(" ").trim();

  if (!songName) return;
  module.exports.run({ api, event, args: [songName], isVideoRequest: isVideo });
};

module.exports.run = async function ({ api, event, args, isVideoRequest }) {
  const query = args.join(" ");
  if (!query) return api.sendMessage(`❌ | Please provide a name!`, event.threadID);

  const type = isVideoRequest ? "video" : "audio";
  const processingMsg = await api.sendMessage(`🔍 | "${query}" khoja ja raha hai...`, event.threadID);

  try {
    const searchResults = await ytSearch(query);
    if (!searchResults || !searchResults.videos.length) throw new Error("Result nahi mila.");

    const video = searchResults.videos[0];
    const videoUrl = video.url;

    // Uzair Rajput API Setup
    const apiBase = type === "video" 
      ? `https://uzairrajputapis.qzz.io/api/downloader/youtube` 
      : `https://uzairrajputapis.qzz.io/api/downloader/ytmp3`;

    api.setMessageReaction("⌛", event.messageID, () => {}, true);

    // 405 Method Not Allowed fix ke liye headers aur params
    const res = await axios.get(apiBase, {
      params: { url: videoUrl },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const result = res.data.result;
    const downloadUrl = result?.download_url || result?.link || res.data.link;

    if (!downloadUrl) throw new Error("Download link invalid hai.");

    const ext = type === "video" ? "mp4" : "mp3";
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const filePath = path.join(cacheDir, `${Date.now()}.${ext}`);

    const file = fs.createWriteStream(filePath);
    https.get(downloadUrl, (response) => {
      response.pipe(file);
      file.on("finish", async () => {
        file.close();
        api.setMessageReaction("✅", event.messageID, () => {}, true);

        await api.sendMessage({
          body: `🎵 Title: ${video.title}\n📺 Type: ${type.toUpperCase()}\n\n»»𝑶𝑾𝑵𝑬𝑹««★™ »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««`,
          attachment: fs.createReadStream(filePath)
        }, event.threadID, () => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          api.unsendMessage(processingMsg.messageID);
        }, event.messageID);
      });
    });

  } catch (error) {
    api.sendMessage(`❌ Error: ${error.message}`, event.threadID);
    api.unsendMessage(processingMsg.messageID);
  }
};
