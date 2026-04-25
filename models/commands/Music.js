const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "video",
  version: "4.2.1",
  hasPermission: 0,
  credits: "Shaan Khan + Fixed",
  description: "YouTube se video download karne ke liye",
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

  const keywordIndex = words.findIndex(word =>
    keywordMatchers.includes(word)
  );

  if (keywordIndex === -1 || keywordIndex === words.length - 1) return;

  let possibleVideoWords = words.slice(keywordIndex + 1);
  possibleVideoWords = possibleVideoWords.filter(
    word => !keywordMatchers.includes(word)
  );

  const videoName = possibleVideoWords.join(" ").trim();
  if (!videoName) return;

  module.exports.run({
    api,
    event,
    args: videoName.split(" ")
  });
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage(
      `❌ | Please video ka naam ya link likhen!`,
      event.threadID
    );
  }

  try {
    const query = args.join(" ");

    const isUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

    let youtubeUrl;
    let videoTitle;
    let searchingMsg;

    searchingMsg = await api.sendMessage(
      `✅ Apki Request Jari Hai Please Wait...`,
      event.threadID
    );

    if (isUrl) {
      youtubeUrl = query.startsWith("http")
        ? query
        : `https://${query}`;
      videoTitle = "Video";
    } else {
      const searchResult = await ytSearch(query);

      if (!searchResult || !searchResult.videos.length) {
        return api.sendMessage(
          `❌ | "${query}" ke liye koi video nahi mili.`,
          event.threadID
        );
      }

      const video = searchResult.videos[0];
      youtubeUrl = video.url;
      videoTitle = video.title;
    }

    // FIXED ENDPOINT
    const apiUrl =
      `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;

    const res = await axios.get(apiUrl, {
      timeout: 60000
    });

    const result = res.data;

    const downloadUrl =
      result?.result?.["360p"] ||
      result?.result?.downloadUrl ||
      result?.result?.download_url ||
      result?.result?.url ||
      result?.videoUrl;

    const apiTitle =
      result?.result?.title ||
      result?.data?.title;

    if (apiTitle) videoTitle = apiTitle;

    if (!downloadUrl) {
      return api.sendMessage(
        `❌ | Video link nikalne mein masla ho raha hai.`,
        event.threadID
      );
    }

    const cacheDir = path.resolve(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(
      cacheDir,
      `${Date.now()}.mp4`
    );

    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      timeout: 180000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);
      response.data.on("error", reject);
      writer.on("error", reject);
      writer.on("finish", resolve);
    });

    const stat = fs.statSync(filePath);

    if (!stat.size || stat.size < 5000) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}

      return api.sendMessage(
        `❌ | Download error. Dubara try karein.`,
        event.threadID
      );
    }

    api.sendMessage(
      {
        body: `🖤${videoTitle}

»»𝑶𝑾𝑵𝑬𝑹««★™
»»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««🥀

𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰 👉 VIDEO`,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      (err) => {
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}

        try {
          api.unsendMessage(searchingMsg.messageID);
        } catch (_) {}

        if (err) {
          api.sendMessage(
            `⚠️ | Video send fail: ${err.message}`,
            event.threadID
          );
        }
      }
    );
  } catch (error) {
    console.error(error);

    api.sendMessage(
      `❌ | Error: ${error.message}`,
      event.threadID
    );
  }
};