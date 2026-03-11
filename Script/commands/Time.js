const request = require("request");
const fs = require("fs-extra"); // fs-extra ব্যবহার করা ভালো কারণ unlinkSync এর আগে চেক করা যায়

module.exports.config = {
    name: "time", // কমান্ডের নাম
    version: "1.0",
    hasPermssion: 0,
    credits: "Rahat Bot",
    description: "নিয়মিত সময় + তারিখের GIF দেখায়",
    commandCategory: "utility",
    cooldowns: 5
};

module.exports.run = async ({ event, api }) => {
    const apiUrl = "https://rahat-time-api.onrender.com/time";
    const path = "./cache/rahat_time.gif";

    try {
        request({ url: apiUrl, encoding: null }, function (err, response, body) {
            if (err) return api.sendMessage("⚠️ API তে সমস্যা হয়েছে!", event.threadID);

            fs.writeFileSync(path, body);

            api.sendMessage(
                {
                    body: "⏱️ সময় + 🗓️ তারিখ",
                    attachment: fs.createReadStream(path)
                },
                event.threadID,
                () => {
                    if (fs.existsSync(path)) fs.unlinkSync(path); // GIF পাঠানোর পরে ডিলিট
                }
            );
        });
    } catch (error) {
        console.error(error);
        api.sendMessage("❌সমস্যা হচ্ছে", event.threadID);
    }
};
