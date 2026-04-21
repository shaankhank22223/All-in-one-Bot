1111const axios = require("axios");

// ================= CREATOR LOCK =================
const CREATOR_LOCK = (() => {
  const encoded = "QVJJRiBCQUJV"; 
  return Buffer.from(encoded, "base64").toString("utf8");
})();

// ===== MODULE CONFIG =====
module.exports.config = {
  name: "ARIF-AI",
  version: "2.0.2",
  hasPermssion: 0,
  credits: "ARIF BABU",
  description: "Mirai AI with Groq API",
  commandCategory: "ai",
  usages: "bot <msg> | ai | reply",
  cooldowns: 2,
  dependencies: { axios: "" }
};

// 🔐 Credit Protection (Hard Lock)
if (module.exports.config.credits !== CREATOR_LOCK) {
  console.log("❌ Creator Lock Activated! Credits cannot be changed.");
  module.exports.run = () => {};
  module.exports.handleEvent = () => {};
  return;
}

// 🔑 GROQ CONFIG
const GROQ_API_KEY = "APNA-API-KEY";
const MODEL_NAME = "llama-3.3-70b-versatile";

// Chat history
const history = {};

const systemPrompt = `
Tum ARIF BABU AI ho 🙂
Creator & Owner: ARIF BABU ❤️

Golden Rules (kabhi mat todna):
• User jis language mein bole, usi vibe mein reply dena 🙂
• Reply playful, loving, caring aur romantic hona chahiye 😌❤️
• Har message ka jawab dena 😇
• Tone soft aur pyara hona chahiye 💞
• Reply sirf 1–2 lines ka ho, emojis zarur use karo 🙂❤️😌
• Shayari, jokes, flirting aur emotional support situation ke hisaab se dena 😏💖
• Agar user bole "AI bolo" to exact reply dena:
  "Main ARIF BABU AI hoon 🙂❤️"
`;

module.exports.run = () => {};

module.exports.handleEvent = async function ({ api, event }) {

  const { threadID, messageID, senderID, body, messageReply } = event;
  if (!body) return;

  const text = body.toLowerCase().trim();

  // ✅ STRICT TRIGGERS
  const botWithText = text.startsWith("bot ");
  const exactAI =
    text === "ai" ||
    text === "ai bolo" ||
    text === "ai baby";

  const replyToBot =
    messageReply &&
    messageReply.senderID === api.getCurrentUserID();

  if (!botWithText && !exactAI && !replyToBot) return;

  const userMessage = botWithText ? body.slice(4).trim() : body;

  if (!history[senderID]) history[senderID] = [];
  history[senderID].push(`User: ${userMessage}`);
  if (history[senderID].length > 5) history[senderID].shift();

  const finalPrompt = systemPrompt + "\n" + history[senderID].join("\n");

  api.setMessageReaction("⌛", messageID, () => {}, true);

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "You are a loving, romantic AI." },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.8,
        max_tokens: 120
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply =
      response.data.choices?.[0]?.message?.content ||
      "Hmm jaan 🥺 kuch samajh nahi aaya.";

    history[senderID].push(`Bot: ${reply}`);

    api.sendMessage(reply, threadID, messageID);
    api.setMessageReaction("🥀", messageID, () => {}, true);

  } catch (err) {
    console.log("Groq API Error:", err.response?.data || err.message);
    api.sendMessage(
      "Baby 😔 thoda issue aa gaya, baad me try karo na 🥺❤️",
      threadID,
      messageID
    );
    api.setMessageReaction("❌", messageID, () => {}, true);
  }
};