const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "vid",
  version: "4.2.2",
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

  const foundTrigger = triggerWords.find(trigger =>
    message.startsWith(trigger)
  );
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
    let videoTitle = "Video";

    const searchingMsg = await api.sendMessage(
      `✅ Apki Request Jari Hai Please Wait...`,
      event.threadID
    );

    if (isUrl) {
      youtubeUrl = query.startsWith("http")
        ? query
        : `https://${query}`;
    } else {
      const searchResult = await ytSearch(query);

      if (!searchResult.videos.length) {
        return api.sendMessage(
          `❌ | Video nahi mili.`,
          event.threadID
        );
      }

      youtubeUrl = searchResult.videos[0].url;
      videoTitle = searchResult.videos[0].title;
    }

    // FIXED API
    const apiUrl =
      `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;

    const { data } = await axios.get(apiUrl, {
      timeout: 60000
    });

    const downloadUrl =
      data?.result?.["360p"] ||
      data?.result?.downloadUrl ||
      data?.result?.url;

    if (!downloadUrl) {
      return api.sendMessage(
        `❌ | Download link nahi mili.`,
        event.threadID
      );
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(
      cacheDir,
      `${Date.now()}.mp4`
    );

    const response = await axios({
      url: downloadUrl,
      method: "GET",
      responseType: "stream",
      timeout: 180000
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);

    // NOW LIMIT = 20MB
    if (sizeMB > 20) {
      fs.unlinkSync(filePath);

      try {
        api.unsendMessage(searchingMsg.messageID);
      } catch (_) {}

      return api.sendMessage(
        `⚠️ Server busy hai ya file size 20MB se zyada hai.`,
        event.threadID
      );
    }

    api.sendMessage(
      {
        body: `🖤 ${videoTitle}\n\n𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰 👉 VIDEO`,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      () => {
        fs.unlinkSync(filePath);

        try {
          api.unsendMessage(searchingMsg.messageID);
        } catch (_) {}
      }
    );
  } catch (err) {
    console.log(err);

    api.sendMessage(
      `❌ Error: ${err.message}`,
      event.threadID
    );
  }
};