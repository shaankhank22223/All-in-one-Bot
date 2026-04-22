const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports.config = {
  name: "lockgroup",
  version: "2.5.0",
  hasPermssion: 1,
  credits: "Shaan",
  description: "Strictly lock Group Name, Photo, Nicknames, Theme and Emoji",
  commandCategory: "group",
  usages: "[name/photo/nickname/theme/all/off]",
  cooldowns: 5
};

if (!global.lockData) global.lockData = {};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const action = args[0]?.toLowerCase();

  // Menu options agar user sirf command likhe
  if (!action) {
    return api.sendMessage(
      "🛡️ **Group Lock Security** 🛡️\n" +
      "━━━━━━━━━━━━━━━━━━\n" +
      "Type karein niche diye gaye options:\n\n" +
      "🔹 `lockgroup name` : Lock Group Name\n" +
      "🔹 `lockgroup photo` : Lock Group Photo\n" +
      "🔹 `lockgroup nickname` : Lock All Nicknames\n" +
      "🔹 `lockgroup theme` : Lock Theme/Emoji\n" +
      "🔹 `lockgroup all` : Lock Everything (A to Z)\n" +
      "🔹 `lockgroup off` : Unlock Everything\n" +
      "━━━━━━━━━━━━━━━━━━", threadID, messageID);
  }

  try {
    const info = await api.getThreadInfo(threadID);
    if (!global.lockData[threadID]) global.lockData[threadID] = {};

    if (action === "off") {
      if (global.lockData[threadID]?.imagePath) {
        if (fs.existsSync(global.lockData[threadID].imagePath)) fs.unlinkSync(global.lockData[threadID].imagePath);
      }
      delete global.lockData[threadID];
      return api.sendMessage("✅ Security disabled! Ab sab kuch unlock hai.", threadID);
    }

    let status = [];

    // All ya Name Lock logic
    if (action === "all" || action === "name") {
      global.lockData[threadID].name = info.threadName;
      status.push("Name 🔒");
    }

    // All ya Photo Lock logic
    if (action === "all" || action === "photo") {
      if (info.imageSrc) {
        const img = await axios.get(info.imageSrc, { responseType: "arraybuffer" });
        const imgPath = path.join(__dirname, "cache", `lock_${threadID}.jpg`);
        fs.writeFileSync(imgPath, Buffer.from(img.data, "binary"));
        global.lockData[threadID].imagePath = imgPath;
        status.push("Photo 🔒");
      }
    }

    // All ya Nickname Lock logic
    if (action === "all" || action === "nickname") {
      global.lockData[threadID].nicknames = info.nicknames;
      status.push("Nicknames 🔒");
    }

    // All ya Theme/Emoji Lock logic
    if (action === "all" || action === "theme") {
      global.lockData[threadID].theme = {
        color: info.color,
        emoji: info.emoji
      };
      status.push("Theme & Emoji 🔒");
    }

    if (status.length === 0) return api.sendMessage("❌ Galat option! Use: lockgroup all", threadID);

    return api.sendMessage(`✅ **Security Activated!**\n━━━━━━━━━━━━━━━━━━\nLocked: ${status.join(", ")}\n\nAb koi bhi change karega (Admin bhi), toh bot auto-reset kar dega!`, threadID);

  } catch (e) {
    return api.sendMessage("⚠️ Error: Bot ko admin banayein aur dubara try karein.", threadID);
  }
};

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, logMessageType, logMessageData, author } = event;
  const settings = global.lockData[threadID];

  if (!settings || author === api.getCurrentUserID()) return;

  try {
    // 1. Reset Name
    if (settings.name && logMessageType === "log:thread-name") {
      await api.setTitle(settings.name, threadID);
    }

    // 2. Reset Photo
    if (settings.imagePath && logMessageType === "log:thread-icon") {
      await api.changeGroupImage(fs.createReadStream(settings.imagePath), threadID);
    }

    // 3. Reset Nicknames
    if (settings.nicknames && logMessageType === "log:user-nickname") {
      const targetID = logMessageData.participant_id;
      const oldNick = settings.nicknames[targetID] || "";
      await api.setUserNickname(oldNick, threadID, targetID);
    }

    // 4. Reset Theme/Emoji
    if (settings.theme) {
      if (logMessageType === "log:thread-color" || logMessageType === "log:thread-icon") {
        const { emoji } = settings.theme;
        await api.setEmoji(emoji, threadID);
      }
    }
  } catch (err) {
    console.error("Lock System Error:", err);
  }
};
