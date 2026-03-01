const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

const baseApiUrl = async () => {
  const base = await axios.get(nix);
  return base.data.api;
};

module.exports = {
  config: {
    name: "video",
    version: "2.0.0",
    credits: "dipto + Rahat Fix",
    countDown: 5,
    hasPermssion: 0,
    description: "Download video & audio from YouTube",
    commandCategory: "media",
    usages: "{pn} -v link/name | -a link/name"
  },

  run: async ({ api, args, event }) => {
    const { threadID, messageID } = event;

    let action = args[0] ? args[0].toLowerCase() : "-v";
    if (!["-v", "video", "-a", "audio"].includes(action)) {
      args.unshift("-v");
      action = "-v";
    }

    const query = args.slice(1).join(" ");
    if (!query)
      return api.sendMessage("❌ নাম বা লিংক দাও", threadID, messageID);

    let baseApi;
    try {
      baseApi = await baseApiUrl();
    } catch {
      return api.sendMessage("❌ API load failed", threadID, messageID);
    }

    try {
      api.sendMessage("⏳ Downloading...", threadID);

      const res = await axios.get(
        `${baseApi}/play?url=${encodeURIComponent(query)}`
      );

      const data = res.data;
      if (!data.status) throw new Error("API Failed");

      const mediaLink =
        action === "-a"
          ? data.downloadUrl
          : data.videoUrl || data.video || data.mp4 || data.downloadUrl;

      if (!mediaLink) throw new Error("No media link");

      const title = (data.title || "media").slice(0, 60);
      const ext = action === "-a" ? "mp3" : "mp4";

      const fileName = `${Date.now()}_${title}.${ext}`.replace(
        /[\\/:"*?<>|]/g,
        ""
      );

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const filePath = path.join(cacheDir, fileName);

      const file = await axios.get(mediaLink, {
        responseType: "arraybuffer"
      });

      fs.writeFileSync(filePath, file.data);

      api.sendMessage(
        {
          body: `${action === "-a" ? "🎵" : "🎬"} ${title}`,
          attachment: fs.createReadStream(filePath)
        },
        threadID,
        () => fs.unlinkSync(filePath),
        messageID
      );
    } catch (e) {
      console.log("VIDEO CMD ERROR:", e.message);
      api.sendMessage("❌ ডাউনলোড করা যায়নি", threadID, messageID);
    }
  }
};
