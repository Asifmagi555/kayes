const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
    name: "uid",
    version: "4.2.0",
    hasPermssion: 0,
    credits: "Rahat Islam (fixed by assistant)",
    description: "Get UID with Neon Image Card",
    commandCategory: "tools",
    usages: "uid / reply / mention / link / @fullname",
    cooldowns: 5
};

// ===== Helper: Extract full name after @ =====
async function getUIDByFullName(api, threadID, text) {
    if (!text.includes("@")) return null;

    const match = text.match(/@(.+)/);
    if (!match) return null;
    const targetName = match[1].trim().toLowerCase().replace(/\s+/g, " ");

    const threadInfo = await api.getThreadInfo(threadID);
    const users = threadInfo.userInfo || [];

    const user = users.find(u => {
        if (!u.name) return false;
        const fullName = u.name.trim().toLowerCase().replace(/\s+/g, " ");
        return fullName === targetName;
    });

    return user ? user.id : null;
}

// ===== Image Generator (with fallback avatar) =====
async function createUserImage(name, uid, avatarUrl) {
    const width = 1200;
    const height = 300;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#0b0016";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Avatar (try to load, use fallback if fails)
    let avatar;
    try {
        avatar = await loadImage(avatarUrl);
    } catch (err) {
        console.error("Avatar load error:", err.message);
        avatar = null;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 90, 0, Math.PI * 2);
    ctx.clip();

    if (avatar) {
        ctx.drawImage(avatar, 60, 60, 180, 180);
    } else {
        // Fallback: gradient circle with "?"
        const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 90);
        gradient.addColorStop(0, "#ff00ff");
        gradient.addColorStop(1, "#00ffff");
        ctx.fillStyle = gradient;
        ctx.fillRect(60, 60, 180, 180);
        // Draw question mark
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 150, 90, 0, Math.PI * 2);
        ctx.clip();
        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 20;
        ctx.fillText("?", 120, 180);
    }
    ctx.restore();

    // Neon circle border
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(150, 150, 95, 0, Math.PI * 2);
    ctx.stroke();

    // Name
    ctx.font = "bold 60px Arial";
    ctx.fillStyle = "#ff00ff";
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 25;
    ctx.fillText(name, 350, 140);

    // UID
    ctx.font = "bold 35px Arial";
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 25;
    ctx.fillText("ID : " + uid, 350, 200);

    // Cyan line
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 5;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(350, 240);
    ctx.lineTo(width - 100, 240);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    return canvas.toBuffer();
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;

    let uid = senderID;

    // --- 1. Reply ---
    if (event.type === "message_reply") {
        uid = event.messageReply.senderID;
    }
    // --- 2. Mentions (traditional @username) ---
    else if (Object.keys(event.mentions || {}).length > 0) {
        uid = Object.keys(event.mentions)[0];
    }
    // --- 3. Arguments ---
    else if (args[0]) {
        // 3a. Facebook link -> use api.getUID
        if (args[0].includes("facebook.com") || args[0].includes("fb.com")) {
            try {
                const resolvedUID = await api.getUID(args[0]);
                if (resolvedUID) {
                    uid = resolvedUID;
                } else {
                    return api.sendMessage("❌ লিঙ্ক থেকে UID পাওয়া যায়নি।", threadID, messageID);
                }
            } catch (err) {
                return api.sendMessage("❌ UID রূপান্তর ব্যর্থ। লিঙ্কটি সঠিক কিনা দেখুন।", threadID, messageID);
            }
        }
        // 3b. Numeric UID
        else if (/^\d+$/.test(args[0]) && args[0].length > 5) {
            uid = args[0];
        }
        // 3c. Full name mention (@Full Name)
        else if (args.join(" ").includes("@")) {
            const id = await getUIDByFullName(api, threadID, args.join(" "));
            if (id) uid = id;
            else return api.sendMessage("❌ এই নামের কোনো সদস্য গ্রুপে নেই।", threadID, messageID);
        }
    }

    // --- Get user info ---
    let userInfo, name;
    try {
        userInfo = await api.getUserInfo(uid);
        name = userInfo[uid].name;
    } catch (err) {
        return api.sendMessage("❌ ব্যবহারকারীর তথ্য পাওয়া যায়নি।", threadID, messageID);
    }

    // --- Avatar URL with access token (provided by user) ---
    const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662"; // ← your token
    const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;

    // --- Generate image ---
    try {
        const imgBuffer = await createUserImage(name, uid, avatarUrl);
        const filePath = path.join(__dirname, "uid_temp.png");
        fs.writeFileSync(filePath, imgBuffer);

        await api.sendMessage({
            body: `👤 ${name} \n🆔 ${uid}`,
            attachment: fs.createReadStream(filePath)
        }, threadID, () => fs.unlinkSync(filePath), messageID);
    } catch (err) {
        console.error("Image generation error:", err);
        // Fallback: send text only
        api.sendMessage(`👤 ${name}\n🆔 ${uid}`, threadID, messageID);
    }
};
