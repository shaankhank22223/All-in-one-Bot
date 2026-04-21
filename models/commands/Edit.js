module.exports.config = {
    name: "edit",
    version: "1.3.0",
    hasPermssion: 0,
    credits: "Shaan",
    description: "Render API fix for Image Editing",
    commandCategory: "Media",
    usages: "[prompt] - Reply to an image",
    prefix: false,
    cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
    const axios = require("axios");
    const fs = require("fs-extra");
    const path = require("path");

    const { threadID, messageID, messageReply, type } = event;

    // 1. Validation
    if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments[0].type !== "photo") {
        return api.sendMessage("⚠️ Please reply to an image with your edit prompt!", threadID, messageID);
    }

    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("❌ Prompt missing!", threadID, messageID);

    const imageUrl = messageReply.attachments[0].url;
    const cachePath = path.join(__dirname, "cache", `edited_${Date.now()}.png`);

    const processingMsg = await api.sendMessage("🎨 AI is working on your request...", threadID);

    try {
        // 2. API Endpoint Fix
        // Note: Check karein agar API endpoint '/gemini' hai ya '/generate'
        // Maine yahan '/gemini' add kiya hai jo common hota hai
        const apiUrl = `https://ai-img-gnrte.onrender.com/gemini`; 
        
        const res = await axios.get(apiUrl, {
            params: {
                prompt: prompt,
                url: imageUrl // Aapka image link yahan ja raha hai
            }
        });

        // 3. API Response Handle karna
        // Agar API direct image URL deti hai:
        const resultUrl = res.data.url || res.data.result || res.data.image;

        if (!resultUrl) {
            throw new Error("API did not return an image URL. Response: " + JSON.stringify(res.data));
        }

        // 4. Download and Send
        const imgRes = await axios.get(resultUrl, { responseType: "arraybuffer" });
        if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));
        
        fs.writeFileSync(cachePath, Buffer.from(imgRes.data, "binary"));

        api.unsendMessage(processingMsg.messageID);

        return api.sendMessage({
            body: `✅ Edited successfully!`,
            attachment: fs.createReadStream(cachePath)
        }, threadID, () => fs.unlinkSync(cachePath), messageID);

    } catch (error) {
        console.error(error);
        api.unsendMessage(processingMsg.messageID);
        
        // 404 Error debugging message
        if (error.response && error.response.status === 404) {
            return api.sendMessage("❌ Error 404: API Endpoint galat hai. Kya aapne sahi route (e.g. /gemini) set kiya hai?", threadID, messageID);
        }
        
        return api.sendMessage(`❌ Error: ${error.message}`, threadID, messageID);
    }
};
