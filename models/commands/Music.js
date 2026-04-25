const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "video",
  version: "4.5.0",
  hasPermission: 0,
  credits: "Shaan Khan",
  description: "YouTube video downloader via QZZ API",
  usePrefix: false,
  commandCategory: "Media",
  cooldowns: 10
};

const triggerWords = ["pika", "bot", "shankar"];
const keywordMatchers = ["video", "dikhao", "play", "chalao", "lagao", "clip"];

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

  let possibleVideoWords = words.slice(keywordIndex + 1);
  possibleVideoWords = possibleVideoWords.filter(word => !keywordMatchers.includes(word));

  const videoName = possibleVideoWords.join(" ").trim();
  if (!videoName) return;

  module.exports.run({ api, event, args: videoName.split(" ") });
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) return api.sendMessage(`❌ | Please video ka naam ya link likhen!`, event.threadID);

  try {
    const query = args.join(" ");
    const isUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

    let youtubeUrl;
    let videoTitle = "Video";
    let searchingMsg = await api.sendMessage(`✅ Apki Request Jari Hai Please Wait...`, event.threadID);

    if (isUrl) {
      youtubeUrl = query.startsWith("http") ? query : `https://${query}`;
    } else {
      const searchResult = await ytSearch(query);
      if (!searchResult || !searchResult.videos.length) {
        return api.sendMessage(`❌ | "${query}" ke liye koi video nahi mili.`, event.threadID);
      }
      youtubeUrl = searchResult.videos[0].url;
      videoTitle = searchResult.videos[0].title;
    }

    // Naya API URL Fix
    const apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;

    const res = await axios.get(apiUrl, { timeout: 60000 });
    const result = res.data;

    // API Response Extraction Logic
    const downloadUrl = result?.result?.downloadUrl || result?.result?.download_url || result?.data?.videoUrl || result?.result?.url;
    const apiTitle = result?.result?.title || result?.data?.title;
    
    if (apiTitle) videoTitle = apiTitle;

    if (!downloadUrl) {
      return api.sendMessage(`❌ | Video link fetch nahi ho saka. API down ho sakti hai.`, event.threadID);
    }

    const cacheDir = path.resolve(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const filePath = path.join(cacheDir, `${Date.now()}.mp4`);

    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      timeout: 300000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
    });

    const stat = fs.statSync(filePath);
    if (stat.size < 1000) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return api.sendMessage(`❌ | File download error: File size bohot kam hai.`, event.threadID);
    }

    // Final Delivery
    api.sendMessage({
      body: `🖤 ${videoTitle}\n»»𝑶𝑾𝑵𝑬𝑹««★™ »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««🥀\n𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰 👉 VIDEO`,
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.unsendMessage(searchingMsg.messageID).catch(() => {});
    });

  } catch (error) {
    console.error("API Error:", error.message);
    api.sendMessage(`❌ | API Error: ${error.message}`, event.threadID);
  }
};
