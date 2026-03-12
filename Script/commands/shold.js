const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
    name: "uid",
    version: "4.0.0",
    hasPermssion: 0,
    credits: "Rahat Islam",
    description: "Get UID with Neon Image Card",
    commandCategory: "tools",
    usages: "uid / reply / mention / link",
    cooldowns: 5
};

// ===== Helper: Full Name Mention Detection =====
async function getUIDByFullName(api, threadID, text) {

    const threadInfo = await api.getThreadInfo(threadID);
    const users = threadInfo.userInfo;

    const name = text.replace("@","").trim().toLowerCase();

    for (let user of users) {

        if (!user.name) continue;

        if (user.name.toLowerCase() == name) {
            return user.id;
        }
    }

    return null;
}

// ===== Image Generator =====
async function createUserImage(name, uid, avatarUrl) {

    const width = 1200;
    const height = 300;

    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0b0016";
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for(let i=0;i<width;i+=40){
        ctx.beginPath();
        ctx.moveTo(i,0);
        ctx.lineTo(i,height);
        ctx.stroke();
    }

    for(let i=0;i<height;i+=40){
        ctx.beginPath();
        ctx.moveTo(0,i);
        ctx.lineTo(width,i);
        ctx.stroke();
    }

    const avatar = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(150,150,90,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(avatar,60,60,180,180);
    ctx.restore();

    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(150,150,95,0,Math.PI*2);
    ctx.stroke();

    ctx.font = "bold 60px Arial";
    ctx.fillStyle = "#ff00ff";
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 25;
    ctx.fillText(name,350,140);

    ctx.font = "bold 35px Arial";
    ctx.fillStyle = "#00ffff";
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 25;
    ctx.fillText("ID : "+uid,350,200);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(350,240);
    ctx.lineTo(width-100,240);
    ctx.stroke();

    return canvas.toBuffer();
}

module.exports.run = async function({api,event,args}) {

    const {threadID,messageID,senderID} = event;

    let uid = senderID;

    // Reply UID
    if(event.type == "message_reply"){
        uid = event.messageReply.senderID;
    }

    // Mention UID
    if(Object.keys(event.mentions).length > 0){
        uid = Object.keys(event.mentions)[0];
    }

    // Facebook Link UID
    if(args[0] && args[0].includes("facebook.com")){
        try{

            const data = await axios.get(
                "https://api.findids.net/api/get-uid-from-username?username="+args[0]
            );

            if(data.data.id){
                uid = data.data.id;
            }

        }catch{
            return api.sendMessage("❌ UID পাওয়া যায়নি",threadID,messageID);
        }
    }

    // Full Name Detection
    if(args.join(" ").includes("@")){
        const id = await getUIDByFullName(api,threadID,args.join(" "));
        if(id) uid = id;
    }

    const info = await api.getUserInfo(uid);
    const name = info[uid].name;

    const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720`;

    const img = await createUserImage(name,uid,avatarUrl);

    const filePath = path.join(__dirname,"uid.png");

    fs.writeFileSync(filePath,img);

    api.sendMessage({
        body:`👤 ${name}`,
        attachment: fs.createReadStream(filePath)
    },threadID,()=>{
        fs.unlinkSync(filePath)
    },messageID);

};
