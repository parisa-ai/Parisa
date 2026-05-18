const API = "";
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const file = document.getElementById("file");
const cam = document.getElementById("cam");

function add(text, who){
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

let camStream = null;
async function openCamera(){
  try {
    if (camStream){
      const c = document.createElement("canvas");
      c.width = cam.videoWidth; c.height = cam.videoHeight;
      c.getContext("2d").drawImage(cam, 0, 0);
      c.toBlob(b => {
        const dt = new DataTransfer();
        dt.items.add(new File([b], "photo.jpg", {type:"image/jpeg"}));
        file.files = dt.files;
      }, "image/jpeg", 0.85);
      camStream.getTracks().forEach(t => t.stop());
      camStream = null;
      cam.srcObject = null;
      cam.style.display = "none";
      return;
    }
    camStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    cam.srcObject = camStream;
    cam.style.display = "block";
  } catch(e){ alert("Camera error: " + e.message); }
}

let recog = null, recOn = false;
function mic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("ভয়েস সাপোর্ট নেই — Chrome ব্যবহার করো।"); return; }
  if(recOn){ try{ recog && recog.stop(); }catch(_){} return; }
  recog = new SR();
  recog.lang = "bn-BD";
  recog.onstart = () => { recOn = true; };
  recog.onend = () => { recOn = false; };
  recog.onresult = e => {
    input.value = (input.value ? input.value + " " : "") + e.results[0][0].transcript;
  };
  try{ recog.start(); }catch(_){}
}

input.addEventListener("keydown", e => { if(e.key === "Enter") send(); });

async function send(){
  const text = input.value;
  if(!text && !file.files[0]) return;

  add(text || "📷 Image sent","user");
  input.value="";

  let imgBase64=null;

  if(file.files[0]){
    const reader=new FileReader();
    reader.readAsDataURL(file.files[0]);
    await new Promise(resolve=>{
      reader.onload=()=>{ imgBase64=reader.result; resolve(); }
    });
    file.value = "";
  }

  let finalMessage = text;

  if(imgBase64){
    finalMessage = `
এই ছবিটা ভালোভাবে analyze করো।
যদি এটা UI design হয় তাহলে HTML CSS code লিখে দাও।
যদি সাধারণ ছবি হয় তাহলে বিস্তারিত explain করো।
User message: ${text}
`;
  }

  try {
    const res = await fetch(API+"/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ message:finalMessage, image:imgBase64 })
    });

    const data = await res.json();
    add(data.reply,"ai");

    const v = await fetch(API+"/voice",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:data.reply})
    });

    if(v.ok){
      const blob = await v.blob();
      new Audio(URL.createObjectURL(blob)).play().catch(()=>{});
    }
  } catch(err) {
    add("নেটওয়ার্ক সমস্যা 😔","ai");
  }
}
