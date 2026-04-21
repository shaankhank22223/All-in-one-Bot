const axios = require("axios");
const fs = require("fs-extra");

module.exports.config = {
  name: "video",
  version: "2.6.0",
  credits: "Shaan Khan",
  hasPermssion: 0,
  cooldowns: 5,
  description: "YouTube video download via Uzair API",
  commandCategory: "media",
  usages: "video <song name / link>",
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

const frames = [
  "🎬 ▰▱▱▱▱▱▱▱▱▱ 10%",
  "📡 ▰▰▰▰▱▱▱▱▱▱ 30%",
  "⚙️ ▰▰▰▰▰▰▱▱▱▱ 60%",
  "📦 ▰▰▰▰▰▰▰▰▱▱ 85%",
  "✅ ▰▰▰▰▰▰▰▰▰▰ 100%"
];

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ");

  if (!query) {
    return api.sendMessage("❌ Video ka naam ya link likhein!", threadID, messageID);
  }

  let loadingMsg;
  try {
    // Initial Search Message
    loadingMsg = await api.sendMessage("✅ Apki Request Jari Hai Please Wait..", threadID);

    // Animation frames
    for (const frame of frames) {
      await new Promise(res => setTimeout(res, 500));
      await api.editMessage(frame, loadingMsg.messageID);
    }

    const apiUrl = `https://uzair-rajput-mtx-api.onrender.com/download/ytmp4?q=${encodeURIComponent(query)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data || !data.downloadUrl) {
      return api.sendMessage("⚠️ Video nahi mil saki. Dusra naam try karein.", threadID, messageID);
    }

    const videoUrl = data.downloadUrl;
    const title = data.title || "Video";
    const path = __dirname + `/cache/${Date.now()}.mp4`;

    const getVid = (await axios.get(videoUrl, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(path, Buffer.from(getVid, "utf-8"));

    await api.unsendMessage(loadingMsg.messageID);

    return api.sendMessage({
      body: `🖤 𝑻𝑰𝑻𝑳𝑬: ${title}\n»»𝑶𝑾𝑵𝑬𝑹««★™  »»𝑺𝑯𝑨𝑨𝑵 𝑲𝑯𝑨𝑵««🥀𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 VIDEO`,
      attachment: fs.createReadStream(path)
    }, threadID, () => fs.unlinkSync(path), messageID);

  } catch (err) {
    console.error(err);
    if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
    return api.sendMessage("⚠️ Server busy hai ya file size limit se zyada hai.", threadID, messageID);
  }
};
