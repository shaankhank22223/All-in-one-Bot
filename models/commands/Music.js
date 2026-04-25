const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "music",
  version: "3.1.0",
  hasPermission: 0,
  credits: "Shaan Khan",
  description: "Smart music player using YouTube (Uzair Rajput API)",
  usePrefix: false,
  commandCategory: "Music",
  cooldowns: 10
};

const triggerWords = ["pika", "bot", "shankar"];
const keywordMatchers = ["gana", "music", "song", "suna", "sunao", "play", "chalao", "lagao"];

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

  let possibleSongWords = words.slice(keywordIndex + 1);
  possibleSongWords = possibleSongWords.filter(word => !keywordMatchers.includes(word));

  const songName = possibleSongWords.join(" ").trim();
  if (!songName) return;

  module.exports.run({ api, event, args: songName.split(" ") });
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) return api.sendMessage(`❌ | Kripya ek gaane ka naam darj karein!`, event.threadID);

  try {
    const query = args.join(" ");
    const searching = await api.sendMessage(`🔍 | "${query}" YouTube par khoja ja raha hai...`, event.threadID);

    // 1. YouTube Search to get Video URL
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data: searchData } = await axios.get(searchUrl);
    const videoIdMatch = searchData.match(/"videoId":"(.*?)"/);
    
    if (!videoIdMatch || !videoIdMatch[1]) {
      return api.sendMessage(`❌ | "${query}" ke liye koi video nahi mila.`, event.threadID);
    }

    const videoId = videoIdMatch[1];
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Using Uzair Rajput API for downloading
    const apiUrl = `https://uzairrajputapis.qzz.io/api/downloader/youtube?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(apiUrl);

    if (!res.data || !res.data.audio) {
      return api.sendMessage(`❌ | Gaane ka MP3 link prapt nahi ho saka.`, event.threadID);
    }

    const title = res.data.title || "audio";
    const downloadUrl = res.data.audio;

    await api.editMessage(`🎵 | "${title}" download kiya ja raha hai...`, searching.messageID);

    // 3. File downloading and sending
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.resolve(cacheDir, `${Date.now()}.mp3`);
    
    const response = await axios.get(downloadUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", async () => {
      await api.sendMessage({
        body: `🎶 | Here's your song: "${title}"\n\nOwner: Shaan Khan`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID);
      
      fs.unlinkSync(filePath);
      api.unsendMessage(searching.messageID);
    });

    writer.on("error", async (err) => {
      console.error(err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      api.sendMessage(`❌ | Download ke dauran truti (error) hui.`, event.threadID);
    });

  } catch (error) {
    console.error(error);
    api.sendMessage(`❌ | Kuch gadbad ho gayi: ${error.message}`, event.threadID);
  }
};
