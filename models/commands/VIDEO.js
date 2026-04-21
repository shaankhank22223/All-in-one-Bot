module.exports.config = {
    name: "video",
    version: "1.0.1",
    hasPermssion: 0,
    credits: "Shaan Khan",
    description: "YouTube video download karein (Uzair Rajput API)",
    commandCategory: "utility",
    usages: "[video link]",
    cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
    const axios = require("axios");
    const fs = require("fs-extra");

    const link = args[0];
    if (!link) return api.sendMessage("Kripya YouTube video ka link dein!", event.threadID, event.messageID);

    const path = __dirname + `/cache/${event.senderID}_vid.mp4`;

    try {
        api.sendMessage("📥 Video fetch ki ja rahi hai, thoda intezar karein...", event.threadID, event.messageID);

        // API Call
        const res = await axios.get(`https://uzair-rajput-mtx-api.onrender.com/download/ytmp4?url=${encodeURIComponent(link)}`);
        
        // API response se download link nikalna (Assuming the API returns { result: { download_url: "..." } })
        // Note: Agar API ka structure alag hai toh niche 'data.download_url' ko change karein.
        const downloadUrl = res.data.download_url || res.data.result;

        if (!downloadUrl) {
            return api.sendMessage("API se download link nahi mil saka.", event.threadID, event.messageID);
        }

        // File download process
        const vidData = (await axios.get(downloadUrl, { responseType: "arraybuffer" })).data;
        fs.writeFileSync(path, Buffer.from(vidData, "utf-8"));

        // Messenger limit check (25MB)
        if (fs.statSync(path).size > 26214400) {
            return api.sendMessage("File 25MB se badi hai, Messenger par send nahi ho sakti.", event.threadID, () => fs.unlinkSync(path), event.messageID);
        }

        api.sendMessage({
            body: "✅ Aapki video taiyar hai!",
            attachment: fs.createReadStream(path)
        }, event.threadID, () => fs.unlinkSync(path), event.messageID);

    } catch (error) {
        console.error(error);
        return api.sendMessage("Kuch galat hua ya API down hai. Dubara koshish karein.", event.threadID, event.messageID);
    }
};
