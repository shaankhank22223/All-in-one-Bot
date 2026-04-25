const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "vid",
  version: "4.2.3",
  hasPermission: 0,
  credits: "Shaan Khan + Fixed",
  description: "YouTube se video download karne ke liye",
  usePrefix: false,
  commandCategory: "Media",
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage(
      "❌ | Video ka naam ya YouTube link dein.",
      event.threadID
    );
  }

  try {
    const query = args.join(" ");
    let youtubeUrl;
    let videoTitle = "Video";

    const msg = await api.sendMessage(
      "✅ Apki Request Jari Hai Please Wait...",
      event.threadID
    );

    const isUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query);

    if (isUrl) {
      youtubeUrl = query.startsWith("http")
        ? query
        : "https://" + query;
    } else {
      const search = await ytSearch(query);

      if (!search.videos.length) {
        return api.sendMessage(
          "❌ | Video nahi mili.",
          event.threadID
        );
      }

      youtubeUrl = search.videos[0].url;
      videoTitle = search.videos[0].title;
    }

    // 405 FIX = GET METHOD ONLY
    const apiUrl =
      `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;

    const res = await axios({
      method: "GET",
      url: apiUrl,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 60000
    });

    const data = res.data;

    const downloadUrl =
      data?.result?.["360p"] ||
      data?.result?.downloadUrl ||
      data?.result?.url ||
      data?.result?.mp4;

    if (!downloadUrl) {
      return api.sendMessage(
        "❌ | Video link nahi mili API se.",
        event.threadID
      );
    }

    if (data?.result?.title) {
      videoTitle = data.result.title;
    }

    const cache = path.join(__dirname, "cache");
    if (!fs.existsSync(cache)) fs.mkdirSync(cache);

    const filePath = path.join(
      cache,
      `${Date.now()}.mp4`
    );

    const video = await axios({
      method: "GET",
      url: downloadUrl,
      responseType: "stream",
      timeout: 180000
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      video.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / 1024 / 1024;

    if (sizeMB > 20) {
      fs.unlinkSync(filePath);

      return api.sendMessage(
        "⚠️ File size 20MB se zyada hai.",
        event.threadID
      );
    }

    api.sendMessage(
      {
        body: `🖤 ${videoTitle}\n\nYE LO BABY APKI VIDEO`,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      () => {
        try {
          fs.unlinkSync(filePath);
          api.unsendMessage(msg.messageID);
        } catch (e) {}
      }
    );

  } catch (err) {
    console.log(err.response?.data || err.message);

    api.sendMessage(
      `❌ Error: ${err.response?.status || ""} ${err.message}`,
      event.threadID
    );
  }
};