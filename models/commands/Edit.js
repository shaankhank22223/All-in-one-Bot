module.exports.config = {
    name: "edit",
    version: "1.2.0",
    hasPermssion: 0,
    credits: "Shaan",
    description: "Render API ka use karke image edit karein",
    commandCategory: "Media",
    usages: "[prompt] - Image ko reply karke prompt dein",
    prefix: false,
    cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
    const axios = require("axios");
    const fs = require("fs-extra");
    const path = require("path");
    const FormData = require("form-data"); // Isse install kar lena: npm install form-data

    const { threadID, messageID, messageReply, type } = event;

    if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments[0].type !== "photo") {
        return api.sendMessage("⚠️ Please reply to an image with your edit prompt!", threadID, messageID);
    }

    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("❌ Prompt missing!", threadID, messageID);

    const imageUrl = messageReply.attachments[0].url;
    const cachePath = path.join(__dirname, "cache", `input_${Date.now()}.png`);
    const outputPath = path.join(__dirname, "cache", `output_${Date.now()}.png`);

    const processingMsg = await api.sendMessage("🎨 API processing your image, please wait...", threadID);

    try {
        if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

        // 1. Image Download karein local cache mein
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(cachePath, Buffer.from(response.data, 'binary'));

        // 2. Form Data taiyar karein (File API ke liye)
        const form = new FormData();
        form.append('prompt', prompt);
        form.append('file', fs.createReadStream(cachePath)); // 'file' field name API ke mutabiq badal sakte hain

        // 3. API Request (POST Method)
        const res = await axios.post("https://ai-img-gnrte.onrender.com/upload", form, {
            headers: {
                ...form.getHeaders(),
            },
            responseType: 'arraybuffer' // Agar API direct image return karti hai
        });

        // 4. Result Save aur Send karein
        fs.writeFileSync(outputPath, res.data);

        api.unsendMessage(processingMsg.messageID);

        return api.sendMessage({
            body: `✅ Edit Complete!\nPrompt: ${prompt}`,
            attachment: fs.createReadStream(outputPath)
        }, threadID, () => {
            if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }, messageID);

    } catch (error) {
        console.error(error);
        api.unsendMessage(processingMsg.messageID);
        return api.sendMessage(`❌ API Error: ${error.message}`, threadID, messageID);
    }
};
