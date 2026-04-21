module.exports.config = {
    name: "gen",
    version: "1.4.0",
    hasPermssion: 0,
    credits: "Shaan",
    description: "Render API se image generate karein",
    commandCategory: "Media",
    usages: "[prompt]",
    prefix: false,
    cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
    const axios = require("axios");
    const fs = require("fs-extra");
    const path = require("path");

    const { threadID, messageID } = event;

    // 1. Prompt check
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("❌ Please provide a prompt! Example: gen a red car", threadID, messageID);

    const cachePath = path.join(__dirname, "cache", `gen_${Date.now()}.png`);
    const processingMsg = await api.sendMessage("🎨 AI is generating your image...", threadID);

    try {
        // 2. Correct Endpoint for Image Generation
        // Aap niche diye gaye endpoints me se koi bhi use kar sakte hain:
        const endpoint = "/api/ai/image/dall-e"; 
        const apiUrl = `https://ai-img-gnrte.onrender.com${endpoint}`;

        const res = await axios.get(apiUrl, {
            params: {
                prompt: prompt
            }
        });

        // 3. Response Handling
        // API aksar { result: "url" } ya direct URL deti hai
        const resultUrl = res.data.result || res.data.url || res.data.image;

        if (!resultUrl) {
            throw new Error("API ne image link nahi diya. Check API response format.");
        }

        // 4. Download and Send
        const imgRes = await axios.get(resultUrl, { responseType: "arraybuffer" });
        
        if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));
        fs.writeFileSync(cachePath, Buffer.from(imgRes.data, "binary"));

        api.unsendMessage(processingMsg.messageID);

        return api.sendMessage({
            body: `✅ Generated: ${prompt}`,
            attachment: fs.createReadStream(cachePath)
        }, threadID, () => fs.unlinkSync(cachePath), messageID);

    } catch (error) {
        console.error(error);
        api.unsendMessage(processingMsg.messageID);
        
        if (error.response && error.response.status === 404) {
            return api.sendMessage("❌ Error 404: Endpoint nahi mila. Server check karein.", threadID, messageID);
        }
        
        return api.sendMessage(`❌ Error: ${error.message}`, threadID, messageID);
    }
};
