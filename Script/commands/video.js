const axios = require("axios");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

async function getStream(url) {
  const res = await axios({ url, responseType: "stream" });
  return res.data;
}

async function downloadVideo(baseApi, url, api, event, title = null) {
  try {
    api.sendMessage("⏳ Video downloading...", event.threadID);

    const apiUrl = `${baseApi}/play?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data.status) throw new Error("API failed");

    // API যেটা দেয় সেটাই use করবে
    const videoLink =
      data.videoUrl ||
      data.video ||
      data.mp4 ||
      data.downloadUrl;

    if (!videoLink) throw new Error("No video link");

    const videoTitle = (title || data.title || "video").slice(0, 60);
    const fileName = `${Date.now()}_${videoTitle}.mp4`
      .replace(/[\\/:"*?<>|]/g, "");

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(cacheDir, fileName);

    const video = await axios.get(videoLink, {
      responseType: "arraybuffer"
    });

    fs.writeFileSync(filePath, video.data);

    api.sendMessage(
      {
        body: `🎬 ${videoTitle}`,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      () => fs.unlinkSync(filePath)
    );
  } catch (e) {
    console.log("VIDEO ERROR:", e.message);
    api.sendMessage("❌ ভিডিও ডাউনলোড করা যায়নি", event.threadID);
  }
}

module.exports.config = {
  name: "video",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "dipto + Rahat Fix",
  description: "YouTube video download (fast API)",
  commandCategory: "media",
  usages: "[video name/link]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  let baseApi;

  try {
    const res = await axios.get(nix);
    baseApi = res.data.api;
    if (!baseApi) throw new Error("API missing");
  } catch {
    return api.sendMessage("❌ API config load failed", event.threadID);
  }

  if (!args.length)
    return api.sendMessage("❌ ভিডিও নাম লিখো", event.threadID);

  const query = args.join(" ");

  // direct youtube link
  if (query.startsWith("http")) {
    return downloadVideo(baseApi, query, api, event);
  }

  // search system
  const search = await yts(query);
  const videos = search.videos.slice(0, 6);

  if (!videos.length)
    return api.sendMessage("❌ কোনো রেজাল্ট পাওয়া যায়নি", event.threadID);

  let msg = "🎬 Video List 🎬\n\n";
  videos.forEach((v, i) => {
    msg += `${i + 1}. ${v.title}\n⏱ ${v.timestamp}\n\n`;
  });

  msg += "👉 রিপ্লাই করো (1-6)";

  const thumbs = await Promise.all(
    videos.map(v => getStream(v.thumbnail))
  );

  api.sendMessage(
    { body: msg, attachment: thumbs },
    event.threadID,
    (err, info) => {
      if (err) return console.log(err);

      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        author: event.senderID,
        videos,
        baseApi
      });
    }
  );
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  if (event.senderID != handleReply.author) return;

  const choice = parseInt(event.body);
  if (isNaN(choice) || choice < 1 || choice > handleReply.videos.length)
    return api.sendMessage("❌ ভুল নাম্বার", event.threadID);

  const video = handleReply.videos[choice - 1];

  api.unsendMessage(handleReply.messageID);

  downloadVideo(handleReply.baseApi, video.url, api, event, video.title);
};
