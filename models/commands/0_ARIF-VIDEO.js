const axios = require("axios");
const yts = require("yt-search");

/* ⚙️ CONFIG */
module.exports.config = {
  name: "video",
  version: "2.5.0",
  credits: "Shaan-uzair", // Aap yahan apna naam likh sakte hain
  hasPermssion: 0,
  cooldowns: 3,
  description: "YouTube video download via Uzair API",
  commandCategory: "media",
  usages: "video <name | link>"
};

/* 🎞️ Loading Frames */
const frames = [
  "🎬 ▰▱▱▱▱▱▱▱▱▱ 10%",
  "📡 ▰▰▰▱▱▱▱▱▱▱ 25%",
  "⚙️ ▰▰▰▰▰▱▱▱▱▱ 45%",
  "📦 ▰▰▰▰▰▰▰▱▱▱ 70%",
  "✅ ▰▰▰▰▰▰▰▰▰▰ 100%"
];

/* 🎥 Stream helper */
async function getStreamFromURL(url, pathName) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 120000 // Video download ke liye zyada time diya hai
  });
  response.data.path = pathName;
  return response.data;
}

/* ================= MAIN RUN ================= */
module.exports.run = async function ({ api, args, event }) {
  if (!args[0]) {
    return api.sendMessage("❌ Video ka naam ya link dein.", event.threadID, event.messageID);
  }

  const query = args.join(" ");
  let loadingMsg;

  try {
    loadingMsg = await api.sendMessage("🔍 Searching and Processing...", event.threadID);

    // Animation Effect
    for (const f of frames) {
      await new Promise(r => setTimeout(r, 400));
      await api.editMessage(f, loadingMsg.messageID);
    }

    // Nayi API URL: Uzair Rajput API
    // Format: https://uzair-rajput-mtx-api.onrender.com/download/ytmp4?q=QUERY
    const apiUrl = `https://uzair-rajput-mtx-api.onrender.com/download/ytmp4?q=${encodeURIComponent(query)}`;
    
    const res = await axios.get(apiUrl);
    const result = res.data;

    // Check if result is successful
    if (!result || !result.downloadUrl) {
      throw new Error("Video download link nahi mila.");
    }

    const videoTitle = result.title || "video";
    const downloadLink = result.downloadUrl;

    await api.unsendMessage(loadingMsg.messageID);

    return api.sendMessage({
        body: `🎬 Title: ${videoTitle}\n📥 Status: Success`,
        attachment: await getStreamFromURL(downloadLink, `${videoTitle}.mp4`)
      },
      event.threadID,
      event.messageID
    );

  } catch (err) {
    console.error(err);
    if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
    return api.sendMessage("⚠️ API Error: Video download nahi ho saki. Shayad file badi hai ya server slow hai.", event.threadID, event.messageID);
  }
};
