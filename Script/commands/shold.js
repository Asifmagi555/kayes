const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const GIFEncoder = require("gifencoder");

module.exports.config = {
  name: "uid",
  version: "6.0.0",
  hasPermssion: 0,
  credits: "Rahat Islam",
  description: "Premium uid (GIF version with matrix rain)",
  commandCategory: "tools",
  usages: "uid / reply / mention / link / @fullname",
  cooldowns: 5
};

// ===== Helper: Find UID by Full Name =====
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

// ===== Futuristic Neon UID GIF Generator =====
async function createUserGif(name, uid, avatarUrl) {
  const width = 1200;
  const height = 400;
  const frames = 30;          // number of frames
  const delay = 100;          // ms per frame

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load avatar once
  let avatar;
  try {
    avatar = await loadImage(avatarUrl);
  } catch {
    avatar = null;
  }

  // Setup GIF encoder
  const encoder = new GIFEncoder(width, height);
  const filePath = path.join(__dirname, "cache", "uid_matrix.gif");
  const writeStream = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    encoder.createReadStream().pipe(writeStream);
    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);

    encoder.start();
    encoder.setRepeat(0);   // loop forever
    encoder.setDelay(delay);
    encoder.setQuality(10);

    // ---- Matrix rain preparation ----
    const cols = Math.floor(width / 20);
    const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%";
    const drops = [];
    const dropCount = 250; // number of falling characters

    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.floor(Math.random() * cols) * 20 + 10,
        y: Math.random() * height,
        speed: 2 + Math.random() * 4,
        char: symbols.charAt(Math.floor(Math.random() * symbols.length))
      });
    }

    // ---- Floating particles ----
    const particles = [];
    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 1,
        size: Math.random() * 4 + 1,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    // ---- Animation loop ----
    for (let frame = 0; frame < frames; frame++) {
      // Clear canvas
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // ---- 1. Matrix rain (moving) ----
      ctx.font = "20px monospace";
      for (let d of drops) {
        ctx.fillStyle = `rgba(0, 255, 70, ${0.7 + Math.sin(frame * 0.2) * 0.3})`;
        ctx.fillText(d.char, d.x, d.y);

        // Update position
        d.y += d.speed;
        if (d.y > height) {
          d.y = -20;
          d.x = Math.floor(Math.random() * cols) * 20 + 10;
          d.char = symbols.charAt(Math.floor(Math.random() * symbols.length));
        }
        // Occasionally change character
        if (Math.random() < 0.02) {
          d.char = symbols.charAt(Math.floor(Math.random() * symbols.length));
        }
      }

      // ---- 2. Floating particles (animated) ----
      for (let p of particles) {
        ctx.fillStyle = `rgba(0, 255, 255, ${p.alpha * (0.5 + 0.5 * Math.sin(frame * 0.1))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Move
        p.x += p.vx;
        p.y += p.vy;
        // Bounce or wrap
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      // ---- 3. Avatar with clipping circle ----
      ctx.save();
      ctx.beginPath();
      ctx.arc(180, 200, 110, 0, Math.PI * 2);
      ctx.clip();
      if (avatar) {
        ctx.drawImage(avatar, 70, 90, 220, 220);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillRect(70, 90, 220, 220);
      }
      ctx.restore();

      // ---- 4. Neon rings around avatar (pulsing) ----
      const pulse = Math.sin(frame * 0.3) * 0.5 + 0.5; // 0..1
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(180, 200, 115 + i * 5, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = i % 2 === 0 ? "#0ff" : "#ff00ff";
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 25 + i * 5 + pulse * 15;
        ctx.stroke();
      }

      // ---- 5. Username (pulsing neon) ----
      ctx.font = "bold 70px Arial";
      ctx.fillStyle = "#ff00ff";
      ctx.shadowColor = "#ff00ff";
      ctx.shadowBlur = 40 + pulse * 20;
      ctx.fillText(name, 360, 180);
      // second layer
      ctx.fillStyle = "#ff77ff";
      ctx.shadowColor = "#ff77ff";
      ctx.shadowBlur = 20 + pulse * 10;
      ctx.fillText(name, 362, 182);

      // ---- 6. UID text (pulsing) ----
      ctx.font = "bold 45px Arial";
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 30 + pulse * 15;
      ctx.fillText("ID : " + uid, 360, 250);

      // ---- 7. Bottom neon gradient lines (static but could pulse) ----
      ctx.shadowBlur = 30;
      const gradient1 = ctx.createLinearGradient(360, 320, 1050, 320);
      gradient1.addColorStop(0, "#0ff");
      gradient1.addColorStop(1, "#ff00ff");
      ctx.beginPath();
      ctx.moveTo(360, 320);
      ctx.lineTo(1050, 320);
      ctx.strokeStyle = gradient1;
      ctx.lineWidth = 5;
      ctx.stroke();

      const gradient2 = ctx.createLinearGradient(360, 335, 950, 335);
      gradient2.addColorStop(0, "#ff00ff");
      gradient2.addColorStop(1, "#0ff");
      ctx.beginPath();
      ctx.moveTo(360, 335);
      ctx.lineTo(950, 335);
      ctx.strokeStyle = gradient2;
      ctx.lineWidth = 4;
      ctx.stroke();

      // ---- 8. Neon corner effects (pulsing) ----
      const cornerColors = ["#0ff", "#ff00ff"];
      const positions = [
        [20, 20],
        [width - 20, 20],
        [20, height - 20],
        [width - 20, height - 20]
      ];
      positions.forEach((pos, index) => {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const offset = 80;
          ctx.strokeStyle = cornerColors[index % 2];
          ctx.lineWidth = 4;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 25 + i * 5 + pulse * 10;
          if (pos[0] < width / 2 && pos[1] < height / 2) {
            // top-left
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0] + offset, pos[1]);
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0], pos[1] + offset);
          } else if (pos[0] > width / 2 && pos[1] < height / 2) {
            // top-right
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0] - offset, pos[1]);
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0], pos[1] + offset);
          } else if (pos[0] < width / 2 && pos[1] > height / 2) {
            // bottom-left
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0] + offset, pos[1]);
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0], pos[1] - offset);
          } else {
            // bottom-right
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0] - offset, pos[1]);
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos[0], pos[1] - offset);
          }
          ctx.stroke();
        }
      });

      // ---- 9. Credit text (tea color, pulsing) ----
      const creditText = "Credit : Rahat Islam";
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 14 + pulse * 10;

      const textWidth = ctx.measureText(creditText).width;
      const creditX = (width - textWidth) / 2;
      const creditY = height - 8;

      // underline
      ctx.strokeStyle = "rgba(208,240,192,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - textWidth / 2, creditY - 20);
      ctx.lineTo(width / 2 + textWidth / 2, creditY - 20);
      ctx.stroke();

      ctx.fillText(creditText, creditX, creditY);

      // reset shadow for next frame
      ctx.shadowBlur = 0;

      // Add frame to GIF
      encoder.addFrame(ctx);
    }

    encoder.finish();
  });
}

// ===== Main Command =====
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let uid = senderID;

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

  let userInfo, name;
  try {
    userInfo = await api.getUserInfo(uid);
    name = userInfo[uid].name;
  } catch {
    return api.sendMessage("❌ ব্যবহারকারীর তথ্য পাওয়া যায়নি।", threadID, messageID);
  }

  const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
  const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;

  try {
    // Generate GIF and get file path
    const gifPath = await createUserGif(name, uid, avatarUrl);

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
    console.log(err);
    api.sendMessage(`👤 ${name}\n🆔 ${uid}`, threadID, messageID);
  }
};
