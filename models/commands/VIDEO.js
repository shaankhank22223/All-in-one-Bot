const fs = require("fs");
const path = require("path");
const axios = require("axios");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "vid",
  version: "4.2.4",
  hasPermission: 0,
  credits: "Shaan Khan + Fixed",
  description: "YouTube video by URL or Query",
  usePrefix: false,
  commandCategory: "Media",
  cooldowns: 10
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage(
      "❌ | Video ka naam ya YouTube URL dein.",
      event.threadID
    );
  }

  try {
    const input = args.join(" ").trim();
    let youtubeUrl = "";
    let videoTitle = "Video";

    const waitMsg = await api.sendMessage(
      "✅ Apki Request Jari Hai Please Wait...",
      event.threadID
    );

    // URL CHECK
    const isUrl =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(input);

    if (isUrl) {
      youtubeUrl = input.startsWith("http")
        ? input
        : "https://" + input;
    } else {
      // QUERY SEARCH
      const search = await ytSearch(input);

      if (!search.videos.length) {
        return api.sendMessage(
          "❌ | Is naam se video nahi mili.",
          event.threadID
        );
      }

      youtubeUrl = search.videos[0].url;
      videoTitle = search.videos[0].title;
    }

    // API CALL (URL + QUERY dono chalega kyunki final youtubeUrl ban gaya)
    const apiUrl =
      `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;

    const res = await axios.get(apiUrl, {
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

    if (data?.result?.title) {
      videoTitle = data.result.title;
    }

    if (!downloadUrl) {
      return api.sendMessage(
        "❌ | Download link nahi mili.",
        event.threadID
      );
    }

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(
      cacheDir,
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

    const sizeMB = fs.statSync(filePath).size / 1024 / 1024;

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
          api.unsendMessage(waitMsg.messageID);
        } catch (_) {}
      }
    );

  } catch (err) {
    console.log(err.response?.data || err.message);

    api.sendMessage(
      `❌ Error: ${err.message}`,
      event.threadID
    );
  }
};