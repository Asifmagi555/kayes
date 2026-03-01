const axios = require("axios");
const fs = require("fs");
const path = require("path");
const yts = require("yt-search");
const fetch = require("node-fetch");

const API_CONFIG = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

module.exports.config = {
  name: "video",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "ArYAN | Converted by Rahat",
  description: "Search & download YouTube video",
  commandCategory: "media",
  usages: "video <name>",
  cooldowns: 5
};

module.exports.run = async function ({
  api,
  event,
  args
}) {

  if (!args[0])
    return api.sendMessage("❌ Video name dao.", event.threadID, event.messageID);

  const query = args.join(" ");

  try {
    const search = await yts(query);
    if (!search.videos.length)
      return api.sendMessage("❌ No video found.", event.threadID);

    const videos = search.videos.slice(0, 6);

    let msg = "🔎 6 ta video paowa gese.\nReply number diye download koro:\n\n";
    let thumbs = [];
    let list = [];

    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];

      const thumb = await axios.get(v.thumbnail, { responseType: "stream" });
      thumbs.push(thumb.data);

      msg += `${i + 1}. ${v.title}
⏱ ${v.timestamp}
📺 ${v.author.name}
👀 ${v.views.toLocaleString()} views\n\n`;

      list.push({
        title: v.title,
        url: v.url,
        channel: v.author.name,
        views: v.views.toLocaleString()
      });
    }

    return api.sendMessage(
      { body: msg, attachment: thumbs },
      event.threadID,
      (err, info) => {
        global.client.handleReply.push({
          name: module.exports.config.name,
          author: event.senderID,
          messageID: info.messageID,
          videos: list
        });
      },
      event.messageID
    );

  } catch (e) {
    api.sendMessage("❌ Search error.", event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function ({
  api,
  event,
  handleReply
}) {

  if (event.senderID != handleReply.author) return;

  const choose = parseInt(event.body);
  if (isNaN(choose) || choose < 1 || choose > 6)
    return api.sendMessage("❌ 1-6 er moddhe number dao.", event.threadID);

  const selected = handleReply.videos[choose - 1];

  let apiURL;
  try {
    const res = await axios.get(API_CONFIG);
    apiURL = res.data.nixtube;
    if (!apiURL) throw new Error();
  } catch {
    return api.sendMessage("❌ Config load error.", event.threadID);
  }

  try {
    const info = await axios.get(
      `${apiURL}?url=${encodeURIComponent(selected.url)}&type=video`
    );

    if (!info.data.status || !info.data.downloadUrl)
      throw new Error("Link error");

    const download = await fetch(info.data.downloadUrl);
    const buffer = await download.buffer();

    const fileName = `${selected.title}`
      .replace(/[\/\\:*?"<>|]/g, "")
      .slice(0, 80) + ".mp4";

    const filePath = path.join(__dirname, fileName);

    fs.writeFileSync(filePath, buffer);

    const caption =
`• Title: ${selected.title}
• Channel: ${selected.channel}
• Quality: ${info.data.quality || "N/A"}
• Views: ${selected.views}`;

    api.sendMessage(
      {
        body: caption,
        attachment: fs.createReadStream(filePath)
      },
      event.threadID,
      () => fs.unlinkSync(filePath),
      event.messageID
    );

  } catch (err) {
    api.sendMessage("❌ Download failed.", event.threadID, event.messageID);
  }
};
