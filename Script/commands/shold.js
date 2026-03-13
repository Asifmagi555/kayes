const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
  name: "uid",
  version: "6.0.0",
  hasPermssion: 0,
  credits: "Rahat Islam",
  description: "Premium uid",
  commandCategory: "tools",
  usages: "uid / reply / mention / link / @fullname",
  cooldowns: 5
};

// ===== Helper: Find UID by Full Name =====
async function getUIDByFullName(api, threadID, text) {
  if (!text.includes("@")) return null;
  const match = text.match(/@(.+)/);
  if (!match) return null;
  const targetName = match[1].trim().toLowerCase().replace(/\s+/g," ");
  const threadInfo = await api.getThreadInfo(threadID);
  const users = threadInfo.userInfo || [];
  const user = users.find(u=>{
    if(!u.name) return false;
    const fullName = u.name.trim().toLowerCase().replace(/\s+/g," ");
    return fullName === targetName;
  });
  return user ? user.id : null;
}

// ===== Futuristic Neon UID Generator =====
async function createUserImage(name, uid, avatarUrl) {
  const width = 1200;
  const height = 400;
  const canvas = createCanvas(width,height);
  const ctx = canvas.getContext("2d");

  // ===== Matrix Cyber Background =====
  ctx.fillStyle = "#000000";
  ctx.fillRect(0,0,width,height);

  const cols = Math.floor(width / 20);
  const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%";

  for(let i=0;i<cols;i++){
    let x = i*20;
    let yOffset = Math.random()*height;
    for(let j=0;j<20;j++){
      let y = (j*20 + yOffset)%height;
      ctx.fillStyle = `rgba(0,255,70,${Math.random()})`;
      let char = symbols.charAt(Math.floor(Math.random()*symbols.length));
      ctx.font="20px monospace";
      ctx.fillText(char,x,y);
    }
  }

  // ===== Floating Particles =====
  for(let i=0;i<80;i++){
    ctx.fillStyle = `rgba(0,255,255,${Math.random()*0.5})`;
    ctx.beginPath();
    let px = Math.random()*width;
    let py = Math.random()*height;
    ctx.arc(px,py,Math.random()*3,0,Math.PI*2);
    ctx.fill();
  }

  // ===== Avatar with Halo =====
  let avatar;
  try{ avatar = await loadImage(avatarUrl); } catch { avatar=null; }
  ctx.save();
  ctx.beginPath();
  ctx.arc(180,200,110,0,Math.PI*2);
  ctx.clip();
  if(avatar) ctx.drawImage(avatar,70,90,220,220);
  else { ctx.fillStyle="#111"; ctx.fillRect(70,90,220,220); }
  ctx.restore();

  // Neon Avatar Ring + Halo
  for(let i=0;i<3;i++){
    ctx.beginPath();
    ctx.arc(180,200,115 + i*5,0,Math.PI*2);
    ctx.lineWidth=4;
    ctx.strokeStyle = i%2===0 ? "#0ff" : "#ff00ff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur=25 + i*5;
    ctx.stroke();
  }

  // ===== Username Neon Text =====
  ctx.font="bold 70px Arial";
  ctx.fillStyle="#ff00ff";
  ctx.shadowColor="#ff00ff";
  ctx.shadowBlur=40;
  ctx.fillText(name,360,180);
  // Extra layered shadow
  ctx.fillStyle="#ff77ff";
  ctx.shadowColor="#ff77ff";
  ctx.shadowBlur=20;
  ctx.fillText(name,362,182);

  // ===== UID Neon Text =====
  ctx.font="bold 45px Arial";
  ctx.fillStyle="#00ffff";
  ctx.shadowColor="#00ffff";
  ctx.shadowBlur=30;
  ctx.fillText("ID : "+uid,360,250);

  // ===== Bottom Neon Gradient Lines =====
  const gradient1 = ctx.createLinearGradient(360,320,1050,320);
  gradient1.addColorStop(0,"#0ff");
  gradient1.addColorStop(1,"#ff00ff");
  ctx.beginPath();
  ctx.moveTo(360,320); ctx.lineTo(1050,320);
  ctx.strokeStyle = gradient1;
  ctx.lineWidth =5;
  ctx.shadowBlur=30; ctx.stroke();

  const gradient2 = ctx.createLinearGradient(360,335,950,335);
  gradient2.addColorStop(0,"#ff00ff");
  gradient2.addColorStop(1,"#0ff");
  ctx.beginPath();
  ctx.moveTo(360,335); ctx.lineTo(950,335);
  ctx.strokeStyle=gradient2;
  ctx.lineWidth=4;
  ctx.shadowBlur=30;
  ctx.stroke();

  // ===== Neon Corner Effects =====
  const cornerColors = ["#0ff","#ff00ff"];
  const positions = [
    [20,20],[width-20,20],[20,height-20],[width-20,height-20]
  ];
  positions.forEach((pos,index)=>{
    for(let i=0;i<3;i++){
      ctx.beginPath();
      const offset = 80;
      ctx.strokeStyle=cornerColors[index%2];
      ctx.lineWidth=4;
      ctx.shadowColor=ctx.strokeStyle;
      ctx.shadowBlur=25 + i*5;
      if(pos[0]<width/2 && pos[1]<height/2){ // top-left
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0]+offset,pos[1]);
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0],pos[1]+offset);
      } else if(pos[0]>width/2 && pos[1]<height/2){ // top-right
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0]-offset,pos[1]);
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0],pos[1]+offset);
      } else if(pos[0]<width/2 && pos[1]>height/2){ // bottom-left
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0]+offset,pos[1]);
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0],pos[1]-offset);
      } else { // bottom-right
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0]-offset,pos[1]);
        ctx.moveTo(pos[0],pos[1]); ctx.lineTo(pos[0],pos[1]-offset);
      }
      ctx.stroke();
    }
  });

  // ===== Credit Text (Tea Color) =====
  const creditText = "Credit : Rahat Islam";
  ctx.font = "bold 28px Arial";
  ctx.fillStyle="#00ffff";  // Tea color
  ctx.shadowColor="#00ffff";
  ctx.shadowBlur=14;

  const textWidth = ctx.measureText(creditText).width;
  const creditX = (width - textWidth)/2;
  const creditY = height - 8;

  ctx.strokeStyle="rgba(208,240,192,0.4)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(width/2 - textWidth/2, creditY-20);
  ctx.lineTo(width/2 + textWidth/2, creditY-20);
  ctx.stroke();

  ctx.fillText(creditText, creditX, creditY);

  return canvas.toBuffer();
}

// ===== Main Command =====
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  let uid = senderID;

  if(event.type==="message_reply") uid = event.messageReply.senderID;
  else if(Object.keys(event.mentions||{}).length>0) uid = Object.keys(event.mentions)[0];
  else if(args[0]){
    if(args[0].includes("facebook.com") || args[0].includes("fb.com")){
      try{
        const resolvedUID = await api.getUID(args[0]);
        if(resolvedUID) uid = resolvedUID;
        else return api.sendMessage("❌ লিঙ্ক থেকে UID পাওয়া যায়নি।",threadID,messageID);
      }catch{ return api.sendMessage("❌Not Find",threadID,messageID);}
    } else if(/^\d+$/.test(args[0])) uid=args[0];
    else if(args.join(" ").includes("@")){
      const id = await getUIDByFullName(api,threadID,args.join(" "));
      if(id) uid=id;
      else return api.sendMessage("❌",threadID,messageID);
    }
  }

  let userInfo,name;
  try{ userInfo = await api.getUserInfo(uid); name = userInfo[uid].name; }
  catch{ return api.sendMessage("❌ ব্যবহারকারীর তথ্য পাওয়া যায়নি।",threadID,messageID); }

  const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
  const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=720&height=720&access_token=${token}`;

  try{
    const buffer = await createUserImage(name,uid,avatarUrl);
    const temp = path.join(__dirname,"uid_matrix_future.png");
    fs.writeFileSync(temp,buffer);

    await api.sendMessage({
      body:`${uid}`,
      attachment: fs.createReadStream(temp)
    }, threadID, ()=>fs.unlinkSync(temp), messageID);

  }catch(err){
    console.log(err);
    api.sendMessage(`👤 ${name}\n🆔 ${uid}`,threadID,messageID);
  }
};
