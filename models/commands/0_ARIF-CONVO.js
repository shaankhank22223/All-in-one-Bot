const fs = require('fs-extra');
const path = require('path');

// Global map for tracking active convos
if (!global.activeConvos) {
    global.activeConvos = new Map();
}

module.exports.config = {
    name: "convo",
    version: "2.0.0",
    hasPermssion: 0, 
    credits: "Shaan Khan",
    description: "Premium Convo Mode for Shaan-Khan-K",
    commandCategory: "Tools",
    usages: "convo on | off",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "path": ""
    }
};

module.exports.run = async function({ api, event, args, Users, Threads, Currencies, client }) {
    const { threadID, senderID, messageID } = event;
    const action = args[0]?.toLowerCase();

    // Permission Check
    const threadInfo = await api.getThreadInfo(threadID);
    const isAdmin = threadInfo.adminIDs.some(item => item.id == senderID);
    const isBotAdmin = global.config.ADMINBOT.includes(senderID);

    if (!isAdmin && !isBotAdmin) {
        return api.sendMessage("Ghalat baat! Sirf group ke admins hi ye command use kar sakte hain.", threadID, messageID);
    }

    if (action === "off") {
        const activeList = [];
        global.activeConvos.forEach((val, key) => {
            activeList.push({ targetTID: key, ...val });
        });

        if (activeList.length === 0) return api.sendMessage("Abhi koi bhi convo nahi chal rahi.", threadID);

        let listMsg = "CHALTI HUI CONVOS\n\n";
        activeList.forEach((item, index) => {
            listMsg += `${index + 1}. Group: ${item.targetName}\nTID: ${item.targetTID}\n\n`;
        });
        listMsg += "Jis convo ko rokna hai us ka number reply mein likhen.";

        return api.sendMessage(listMsg, threadID, (err, info) => {
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                step: "OFF_LIST",
                activeList
            });
        }, messageID);
    }

    if (action === "on") {
        const msg = "CONVO MODE ON\n\nStep 1: Hater ka naam likhen ya 'skip' likh kar aage barhen.";
        return api.sendMessage(msg, threadID, (err, info) => {
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                step: 1,
                convoData: {}
            });
        }, messageID);
    }

    return api.sendMessage(`Sahi tarika ye hai: ${global.config.PREFIX}convo on ya off`, threadID, messageID);
};

module.exports.handleReply = async function({ api, event, handleReply, Users }) {
    const { body, senderID, threadID, messageID } = event;
    if (handleReply.author != senderID) return;

    let { step, convoData = {} } = handleReply;

    if (step === "OFF_LIST") {
        const index = parseInt(body) - 1;
        const item = handleReply.activeList[index];
        if (item) {
            if (item.timeout) clearTimeout(item.timeout);
            global.activeConvos.delete(item.targetTID);
            return api.sendMessage(`Theek hai, ${item.targetName} mein convo rok di gayi hai.`, threadID, messageID);
        }
    }

    switch (step) {
        case 1:
            convoData.hatersName = body.toLowerCase() === "skip" ? "" : body;
            api.sendMessage("Target ID likhen (Group ya User ID).", threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    step: 3,
                    convoData
                });
            }, messageID);
            break;

        case 3:
            convoData.targetTID = body.trim();
            api.sendMessage("Speed batao kitne seconds ka gap chahiye? (Misal ke taur par: 2)", threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    step: 4,
                    convoData
                });
            }, messageID);
            break;

        case 4:
            const speed = parseInt(body);
            if (isNaN(speed) || speed < 1) return api.sendMessage("Sahi number likhen bhai.", threadID, messageID);
            convoData.speed = speed;
            // Folder aur File name update kiya gaya yahan
            api.sendMessage(`Sab set hai!\n\nFolder: ARIF-BABU\nFile: FYT_GROUP.txt\n\nAb 'confirm' likh kar start karen!`, threadID, (err, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: senderID,
                    step: "CONFIRM",
                    convoData
                });
            }, messageID);
            break;

        case "CONFIRM":
            if (body.toLowerCase() === "confirm") {
                api.sendMessage("Convo shuru kar di gayi hai! Shaan Khan ki power on ho gayi heater ki ma chod denge ab.", threadID);
                startConvolution(api, convoData, threadID);
            }
            break;
    }
};

async function startConvolution(api, data, originThreadID) {
    const { targetTID, speed, hatersName } = data;
    // Path update: ARIF-BABU/FYT_GROUP.txt
    const filePath = path.join(__dirname, "ARIF-BABU", "FYT_GROUP.txt");

    if (!fs.existsSync(filePath)) {
        return api.sendMessage(`Error: ARIF-BABU folder ya FYT_GROUP.txt file nahi mili!`, originThreadID);
    }

    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(line => line.trim() !== "");
    if (lines.length === 0) return api.sendMessage("File bilkul khali hai!", originThreadID);

    let targetName = "Target Group";
    try {
        const info = await api.getThreadInfo(targetTID);
        targetName = info.threadName || targetTID;
    } catch(e) { targetName = targetTID; }

    let index = 0;
    const execute = async () => {
        if (!global.activeConvos.has(targetTID)) return;

        const msgBody = hatersName ? `${hatersName} ${lines[index]}` : lines[index];
        api.sendMessage(msgBody, targetTID);

        index = (index + 1) % lines.length;
        const timeout = setTimeout(execute, speed * 1000);
        global.activeConvos.set(targetTID, { originThreadID, targetName, timeout });
    };

    global.activeConvos.set(targetTID, { originThreadID, targetName });
    execute();
}
