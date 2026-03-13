const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "uid",
  version: "6.0.0",
  hasPermssion: 0,
  credits: "Rahat Islam",
  description: "Premium uid (GIF version with matrix rain) - Render API",
  commandCategory: "tools",
  usages: "uid / reply / mention / link / @fullname",
  cooldowns: 5
};

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

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let uid = senderID;

  // UID বের করার অংশ
  if (event.type === "message_reply") uid = event.messageReply.senderID;
  else if (Object.keys(event.mentions || {}).length > 0) uid = Object.keys(event.mentions)[0];
  else if (args[0]) {
    if (args[0].includes("facebook.com") || args[0].includes("fb.com")) {
      try {
        const resolvedUID = await api.getUID(args[0]);
        if (resolvedUID) uid = resolvedUID;
        else return api.sendMessage("❌ লিঙ্ক থেকে UID পাওয়া যায়নি।", threadID, messageID);
      } catch {
        return api.sendMessage("❌ Not Find", threadID, messageID);
      }
    } else if (/^\d+$/.test(args[0])) uid = args[0];
    else if (args.join(" ").includes("@")) {
      const id = await getUIDByFullName(api, threadID, args.join(" "));
      if (id) uid = id;
      else return api.sendMessage("❌", threadID, messageID);
    }
  }

  // ইউজারের নাম সংগ্রহ
  let userInfo, name;
  try {
    userInfo = await api.getUserInfo(uid);
    name = userInfo[uid].name;
  } catch {
    return api.sendMessage("❌ ব্যবহারকারীর তথ্য পাওয়া যায়নি।", threadID, messageID);
  }

  // ✅ এখানে আপনার Render URL বসানো হলো
  const RENDER_API_URL = "https://uid-render-api.onrender.com/generate-uid-gif";

  try {
    const response = await axios.post(RENDER_API_URL, { uid, name }, {
      responseType: 'arraybuffer'
    });

    const gifPath = path.join(__dirname, "cache", `uid_${Date.now()}.gif`);
    await fs.outputFile(gifPath, response.data);

    await api.sendMessage(
      {
        body: `${uid}`,
        attachment: fs.createReadStream(gifPath)
      },
      threadID,
      () => fs.unlinkSync(gifPath),
      messageID
    );
  } catch (err) {
    console.error("Render API error:", err.message);
    api.sendMessage(`👤 ${name}\n🆔 ${uid}`, threadID, messageID);
  }
};
