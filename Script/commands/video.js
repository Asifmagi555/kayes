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
    const res = await axios.get(apiUrl, { timeout: 20000 });
    const data = res.data;

    if (!data.status || !data.videoUrl)
      throw new Error("API Failed");

    const videoTitle = (title || data.title).slice(0, 60);
    const fileName = `${Date.now()}_${videoTitle}.mp4`
      .replace(/[\\/:"*?<>|]/g, "");

    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const filePath = path.join(cacheDir, fileName);

    const video = await axios.get(data.videoUrl, {
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
    console.log(e);
    api.sendMessage("❌ ভিডিও ডাউনলোড করা যায়নি", event.threadID);
  }
}

module.exports.config = {
  name: "video",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "dipto + modified by Rahat",
  description: "YouTube video download",
  commandCategory: "media",
  usages: "[video name/link]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  let baseApi;

  try {
    const res = await axios.get(nix);
    baseApi = res.data.api;
  } catch {
    return api.sendMessage("❌ API load failed", event.threadID);
  }

  if (!args.length)
    return api.sendMessage("❌ ভিডিও নাম লিখো", event.threadID);

  const query = args.join(" ");

  // direct link
  if (query.startsWith("http")) {
    return downloadVideo(baseApi, query, api, event);
  }

  // search
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
