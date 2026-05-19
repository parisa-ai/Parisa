'use strict';

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let settings = {};
let allChats = JSON.parse(localStorage.getItem('parisaChats') || '{}');
let currentChatId = null;
let isAudioCallActive = false;
let isVideoCallActive = false;
let callSeconds = 0;
let callInterval = null;
let recognition = null;
let isListening = false;
let isTTSPlaying = false;
let ttsAudio = null;
let mediaStream = null;
let facingMode = 'user';
let videoFrameInterval = null;
let pendingImage = null;
let micActive = false;

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
async function init() {
  try {
    await loadSettingsFromServer();
  } catch {}
  updateAvatars();
  renderChatList();
  if (!currentChatId) newChat();
  setTimeout(hideSplash, 2200);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function hideSplash() {
  document.getElementById('splash').classList.add('hidden');
}

// ──────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────
async function loadSettingsFromServer() {
  const r = await fetch('/api/parisa/settings');
  if (r.ok) settings = await r.json();
}

function openSettings() {
  closeSidebar();
  document.getElementById('settingsOverlay').classList.remove('hidden');
  const panel = document.getElementById('settingsPanel');
  panel.classList.remove('hidden');
  setTimeout(() => panel.classList.add('open'), 10);
  populateSettingsUI();
}

function closeSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.classList.remove('open');
  setTimeout(() => {
    panel.classList.add('hidden');
    document.getElementById('settingsOverlay').classList.add('hidden');
  }, 350);
}

function populateSettingsUI() {
  document.getElementById('voiceSelect').value = settings.voice || 'bn-BD-NabanitaNeural';
  document.getElementById('settingUserName').value = settings.userName || 'দাদা';
  document.getElementById('settingPrompt').value = settings.customPrompt || '';
  document.getElementById('settingLogoUrl').value = settings.logoUrl || '';
  document.getElementById('groqKeyInput').value = settings.groqKey ? '***' : '';
  document.getElementById('geminiKeyInput').value = settings.geminiKey ? '***' : '';
  if (settings.groqKey) setStatusDot('groqStatusDot', 'valid');
  if (settings.geminiKey) setStatusDot('geminiStatusDot', 'valid');
  loadUploadedFileList();
}

async function saveSettings() {
  const payload = {
    voice: document.getElementById('voiceSelect').value,
    userName: document.getElementById('settingUserName').value.trim() || 'দাদা',
    customPrompt: document.getElementById('settingPrompt').value.trim(),
    logoUrl: document.getElementById('settingLogoUrl').value.trim(),
  };
  await fetch('/api/parisa/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  settings = { ...settings, ...payload };
  updateAvatars();
  closeSettings();
  showToast('সেটিংস সেভ হয়েছে ✓');
}

async function resetSettings() {
  if (!confirm('সব সেটিংস রিসেট করবেন?')) return;
  await fetch('/api/parisa/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice:'bn-BD-NabanitaNeural', userName:'দাদা', customPrompt:'', logoUrl:'', geminiKey:'', groqKey:'' }),
  });
  await loadSettingsFromServer();
  populateSettingsUI();
  updateAvatars();
  showToast('রিসেট সম্পন্ন');
}

async function testVoice() {
  const voice = document.getElementById('voiceSelect').value;
  await fetch('/api/parisa/settings', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ voice }),
  });
  settings.voice = voice;
  await playTTS('হ্যালো দাদা, আমি পারিসা। কেমন আছেন?');
}

// ──────────────────────────────────────────────
// API KEYS
// ──────────────────────────────────────────────
async function saveAndCheckKey(type) {
  const inputEl = document.getElementById(type === 'groq' ? 'groqKeyInput' : 'geminiKeyInput');
  const key = inputEl.value.trim();
  if (!key || key === '***') return showToast('একটি API key দিন');

  setStatusDot(type === 'groq' ? 'groqStatusDot' : 'geminiStatusDot', 'checking');

  const payload = type === 'groq' ? { groqKey: key } : { geminiKey: key };
  await fetch('/api/parisa/settings', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload),
  });
  settings = { ...settings, ...payload };

  const r = await fetch('/api/parisa/validate-key', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ type, key }),
  });
  const { valid } = await r.json();
  setStatusDot(type === 'groq' ? 'groqStatusDot' : 'geminiStatusDot', valid ? 'valid' : 'invalid');
  showToast(valid ? 'API Key সক্রিয় ✓' : 'API Key ভুল আছে ✗');
  inputEl.value = '***';
}

function setStatusDot(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'status-dot';
  if (state) el.classList.add(state);
}

// ──────────────────────────────────────────────
// FILE UPLOAD (settings assets)
// ──────────────────────────────────────────────
async function uploadAssets(input) {
  const files = input.files;
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  showToast('আপলোড হচ্ছে...');
  const r = await fetch('/api/parisa/upload', { method:'POST', body: fd });
  const data = await r.json();
  if (data.success) {
    settings.customFiles = data.files;
    loadUploadedFileList();
    showToast(`${files.length}টি ফাইল আপলোড হয়েছে ✓`);
  }
  input.value = '';
}

async function loadUploadedFileList() {
  const r = await fetch('/api/parisa/files');
  const { files } = await r.json();
  const listEl = document.getElementById('uploadedFileList');
  listEl.innerHTML = '';
  (files || []).forEach(f => {
    const item = document.createElement('div');
    item.className = 'uploaded-file-item';
    item.innerHTML = `<span>${f.name}</span><button class="delete-file-btn" onclick="deleteFile('${f.filename}')">✕</button>`;
    listEl.appendChild(item);
  });
}

async function deleteFile(filename) {
  await fetch(`/api/parisa/files/${filename}`, { method:'DELETE' });
  loadUploadedFileList();
}

// ──────────────────────────────────────────────
// AVATAR UPDATE
// ──────────────────────────────────────────────
function updateAvatars() {
  const url = settings.logoUrl || '';
  ['headerAvatarImg','mainAvatarImg','callLogoImg'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) {
      el.src = url;
      el.style.display = 'block';
      const sib = el.nextElementSibling;
      if (sib) sib.style.display = 'none';
    } else {
      el.src = '';
      el.style.display = 'none';
      const sib = el.nextElementSibling;
      if (sib) sib.style.display = 'flex';
    }
  });
  if (url) {
    const splashLogo = document.getElementById('splashLogo');
    if (splashLogo) {
      splashLogo.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
  }
}

// ──────────────────────────────────────────────
// SIDEBAR & CHAT HISTORY
// ──────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebarOverlay').classList.remove('hidden');
  const sb = document.getElementById('sidebar');
  sb.classList.remove('hidden');
  setTimeout(() => sb.classList.add('open'), 10);
  renderChatList();
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.remove('open');
  setTimeout(() => {
    sb.classList.add('hidden');
    document.getElementById('sidebarOverlay').classList.add('hidden');
  }, 300);
}

function renderChatList() {
  const listEl = document.getElementById('chatList');
  listEl.innerHTML = '';
  const ids = Object.keys(allChats).sort((a,b) => b-a);
  ids.forEach(id => {
    const chat = allChats[id];
    const firstMsg = chat.messages?.[0]?.text || 'নতুন চ্যাট';
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === currentChatId ? ' active' : '');
    item.innerHTML = `
      <span class="chat-item-text">${firstMsg.slice(0,30)}</span>
      <div class="chat-item-actions">
        <button class="chat-action-btn" onclick="deleteChat('${id}',event)">🗑</button>
      </div>`;
    item.onclick = () => loadChat(id);
    listEl.appendChild(item);
  });
}

function newChat() {
  currentChatId = Date.now().toString();
  allChats[currentChatId] = { messages: [] };
  saveChats();
  renderMessages([]);
  closeSidebar();
}

function loadChat(id) {
  currentChatId = id;
  const chat = allChats[id] || { messages: [] };
  renderMessages(chat.messages);
  closeSidebar();
}

function deleteChat(id, e) {
  e.stopPropagation();
  if (Object.keys(allChats).length <= 1) return showToast('কমপক্ষে একটি চ্যাট থাকতে হবে');
  delete allChats[id];
  saveChats();
  if (id === currentChatId) newChat();
  else renderChatList();
}

function saveChats() {
  localStorage.setItem('parisaChats', JSON.stringify(allChats));
}

function renderMessages(messages) {
  const msgsEl = document.getElementById('messages');
  msgsEl.innerHTML = '';
  const welcome = document.getElementById('welcomeSection');
  welcome.style.display = messages.length === 0 ? 'flex' : 'none';
  messages.forEach(m => appendMessageDOM(m.text, m.who, m.imgUrl, false));
  scrollToBottom();
}

// ──────────────────────────────────────────────
// CHAT
// ──────────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('textInput');
  const text = input.value.trim();
  if (!text && !pendingImage) return;

  input.value = '';
  document.getElementById('welcomeSection').style.display = 'none';

  appendMessageDOM(text || '📷 ছবি পাঠালাম', 'user', pendingImage, true);
  const imgToSend = pendingImage;
  pendingImage = null;

  const typing = showTypingIndicator();

  try {
    const body = { message: text || 'এই ছবিটা দেখো', image: imgToSend };
    const r = await fetch('/api/parisa/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body),
    });
    const data = await r.json();
    typing.remove();
    const msgEl = appendMessageDOM('', 'ai', data.imageUrl, true);
    await typeTextInElement(msgEl.querySelector('.msg-text'), data.reply);
    msgEl.classList.add('has-actions');
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-actions';
    actionsDiv.innerHTML = `
      <button class="msg-action-btn" onclick="copyText(this)" title="কপি">📋 কপি</button>
      <button class="msg-action-btn" onclick="playMsgVoice(this)" data-text="${escapeAttr(data.reply)}" title="শুনুন">🔊 ভয়েস</button>`;
    msgEl.appendChild(actionsDiv);
    saveMessage(text || '📷 ছবি', 'user', imgToSend);
    saveMessage(data.reply, 'ai', data.imageUrl);
  } catch {
    typing.remove();
    appendMessageDOM('নেটওয়ার্ক সমস্যা হচ্ছে।', 'ai', null, true);
  }
}

function appendMessageDOM(text, who, imgUrl, animate) {
  const msgsEl = document.getElementById('messages');
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + who;
  if (!animate) wrap.style.animation = 'none';

  const textEl = document.createElement('span');
  textEl.className = 'msg-text';
  textEl.textContent = text;
  wrap.appendChild(textEl);

  if (imgUrl) {
    const img = document.createElement('img');
    img.src = imgUrl;
    img.className = 'msg-img';
    img.onclick = () => openImagePreview(imgUrl);
    wrap.appendChild(img);
  }
  msgsEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

async function typeTextInElement(el, text) {
  el.textContent = '';
  const speed = Math.max(12, Math.min(30, 3000 / text.length));
  for (const char of text) {
    el.textContent += char;
    scrollToBottom();
    await sleep(speed);
  }
}

function showTypingIndicator() {
  const msgsEl = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  msgsEl.appendChild(div);
  scrollToBottom();
  return div;
}

function saveMessage(text, who, imgUrl) {
  if (!allChats[currentChatId]) allChats[currentChatId] = { messages: [] };
  allChats[currentChatId].messages.push({ text, who, imgUrl: imgUrl || null });
  saveChats();
}

// ──────────────────────────────────────────────
// VOICE / TTS
// ──────────────────────────────────────────────
async function playTTS(text) {
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  isTTSPlaying = true;
  try {
    const r = await fetch('/api/parisa/voice', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error('voice error');
    const blob = await r.blob();
    ttsAudio = new Audio(URL.createObjectURL(blob));
    ttsAudio.onended = () => { isTTSPlaying = false; ttsAudio = null; };
    ttsAudio.onerror = () => { isTTSPlaying = false; };
    await ttsAudio.play();
  } catch {
    isTTSPlaying = false;
  }
}

async function playMsgVoice(btn) {
  const text = btn.getAttribute('data-text');
  if (isTTSPlaying) {
    if (ttsAudio) ttsAudio.pause();
    isTTSPlaying = false;
    btn.textContent = '🔊 ভয়েস';
    return;
  }
  btn.textContent = '⏸ থামাও';
  await playTTS(text);
  btn.textContent = '🔊 ভয়েস';
}

// ─────────────────────�����────────────────────────
// MIC (chat mode)
// ──────────────────────────────────────────────
function toggleMic() {
  if (micActive) stopMic();
  else startMic();
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return showToast('ভয়েস সাপোর্ট নেই — Chrome ব্যবহার করুন');
  const rec = new SR();
  rec.lang = 'bn-BD';
  rec.continuous = false;
  rec.interimResults = false;
  rec.onstart = () => { micActive = true; document.getElementById('micBtn').classList.add('recording'); };
  rec.onend = () => { micActive = false; document.getElementById('micBtn').classList.remove('recording'); };
  rec.onresult = e => {
    document.getElementById('textInput').value = e.results[0][0].transcript;
    sendMessage();
  };
  rec.start();
}

function stopMic() {
  micActive = false;
  document.getElementById('micBtn').classList.remove('recording');
}

// ──────────────────────────────────────────────
// IMAGE / CAMERA
// ──────────────────────────────────────────────
function triggerImageUpload() {
  document.getElementById('imageFileInput').click();
}

function triggerCameraCapture() {
  document.getElementById('cameraInput').click();
}

function handleImageFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingImage = e.target.result;
    showToast('ছবি যোগ হয়েছে — এখন মেসেজ পাঠান');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function openImagePreview(src) {
  document.getElementById('imagePreviewImg').src = src;
  document.getElementById('imagePreviewOverlay').classList.remove('hidden');
}

function closeImagePreview() {
  document.getElementById('imagePreviewOverlay').classList.add('hidden');
}

// ──────────────────────────────────────────────
// AUDIO CALL
// ──────────────────────────────────────────────
async function startAudioCall() {
  if (isAudioCallActive) return;
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return showToast('মাইক্রোফোন অনুমতি দিন');
  }
  isAudioCallActive = true;
  document.getElementById('audioCall').classList.remove('hidden');
  document.getElementById('callStatusText').textContent = 'শুনছি...';
  startCallTimer('callTimerDisplay');
  startContinuousListen();
}

function endAudioCall() {
  isAudioCallActive = false;
  stopCallTimer();
  stopRecognition();
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  isTTSPlaying = false;
  document.getElementById('audioCall').classList.add('hidden');
}

function startContinuousListen() {
  if (!isAudioCallActive) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('callStatusText').textContent = 'ভয়েস সাপোর্ট নেই';
    return;
  }
  const rec = new SR();
  rec.lang = 'bn-BD';
  rec.continuous = false;
  rec.interimResults = false;
  recognition = rec;

  rec.onstart = () => {
    isListening = true;
    if (isAudioCallActive) document.getElementById('callStatusText').textContent = 'শুনছি...';
  };

  rec.onresult = async (e) => {
    isListening = false;
    const userText = e.results[0][0].transcript;
    if (!isAudioCallActive) return;
    document.getElementById('callStatusText').textContent = 'ভাবছি...';
    try {
      const r = await fetch('/api/parisa/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: userText }),
      });
      const data = await r.json();
      if (!isAudioCallActive) return;
      document.getElementById('callStatusText').textContent = 'বলছি...';
      saveMessage(userText, 'user', null);
      saveMessage(data.reply, 'ai', null);
      isTTSPlaying = true;
      const vr = await fetch('/api/parisa/voice', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: data.reply }),
      });
      if (vr.ok) {
        const blob = await vr.blob();
        ttsAudio = new Audio(URL.createObjectURL(blob));
        ttsAudio.onended = () => {
          isTTSPlaying = false;
          if (isAudioCallActive) startContinuousListen();
        };
        ttsAudio.onerror = () => {
          isTTSPlaying = false;
          if (isAudioCallActive) startContinuousListen();
        };
        await ttsAudio.play();
      } else {
        isTTSPlaying = false;
        if (isAudioCallActive) startContinuousListen();
      }
    } catch {
      if (isAudioCallActive) setTimeout(startContinuousListen, 1000);
    }
  };

  rec.onend = () => {
    isListening = false;
    if (isAudioCallActive && !isTTSPlaying) {
      setTimeout(startContinuousListen, 400);
    }
  };

  rec.onerror = () => {
    isListening = false;
    if (isAudioCallActive && !isTTSPlaying) {
      setTimeout(startContinuousListen, 1000);
    }
  };

  try { rec.start(); } catch {}
}

function stopRecognition() {
  isListening = false;
  if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
}

// ──────────────────────────────────────────────
// VIDEO CALL
// ──────────────────────────────────────────────
async function startVideoCall() {
  if (isVideoCallActive) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
  } catch {
    return showToast('ক্যামেরা/মাইক্রোফোন অনুমতি দিন');
  }
  isVideoCallActive = true;
  const video = document.getElementById('videoStream');
  video.srcObject = mediaStream;
  document.getElementById('videoCall').classList.remove('hidden');
  document.getElementById('videoStatusText').textContent = 'কানেক্টড';
  startCallTimer('videoTimerDisplay');
  startVideoSpeechListen();
  startVideoFrameCapture();
}

function endVideoCall() {
  isVideoCallActive = false;
  stopCallTimer();
  stopRecognition();
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (videoFrameInterval) { clearInterval(videoFrameInterval); videoFrameInterval = null; }
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  isTTSPlaying = false;
  document.getElementById('videoCall').classList.add('hidden');
}

async function flipCamera() {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  if (!isVideoCallActive) return;
  mediaStream?.getTracks().forEach(t => t.stop());
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });
    document.getElementById('videoStream').srcObject = mediaStream;
  } catch {}
}

function startVideoSpeechListen() {
  if (!isVideoCallActive) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = 'bn-BD';
  rec.continuous = false;
  rec.interimResults = false;
  recognition = rec;

  rec.onresult = async (e) => {
    const userText = e.results[0][0].transcript;
    if (!isVideoCallActive) return;
    const frameData = captureVideoFrame();
    try {
      const r = await fetch('/api/parisa/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: userText, image: frameData }),
      });
      const data = await r.json();
      if (!isVideoCallActive) return;
      isTTSPlaying = true;
      const vr = await fetch('/api/parisa/voice', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text: data.reply }),
      });
      if (vr.ok) {
        const blob = await vr.blob();
        ttsAudio = new Audio(URL.createObjectURL(blob));
        ttsAudio.onended = () => { isTTSPlaying = false; if (isVideoCallActive) startVideoSpeechListen(); };
        ttsAudio.onerror = () => { isTTSPlaying = false; };
        await ttsAudio.play();
      }
    } catch {
      if (isVideoCallActive) setTimeout(startVideoSpeechListen, 1000);
    }
  };

  rec.onend = () => { if (isVideoCallActive && !isTTSPlaying) setTimeout(startVideoSpeechListen, 400); };
  rec.onerror = () => { if (isVideoCallActive && !isTTSPlaying) setTimeout(startVideoSpeechListen, 1000); };
  try { rec.start(); } catch {}
}

function startVideoFrameCapture() {
  if (videoFrameInterval) clearInterval(videoFrameInterval);
}

function captureVideoFrame() {
  try {
    const video = document.getElementById('videoStream');
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    canvas.getContext('2d').drawImage(video, 0, 0, 640, 360);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch { return null; }
}

// ──────────────────────────────────────────────
// CALL TIMER
// ──────────────────────────────────────────────
function startCallTimer(displayId) {
  callSeconds = 0;
  stopCallTimer();
  callInterval = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2,'0');
    const s = String(callSeconds % 60).padStart(2,'0');
    const el = document.getElementById(displayId);
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

function stopCallTimer() {
  if (callInterval) { clearInterval(callInterval); callInterval = null; }
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function scrollToBottom() {
  const chat = document.getElementById('chat');
  chat.scrollTop = chat.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg) {
  let t = document.getElementById('toastEl');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toastEl';
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,188,212,.9);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;transition:opacity .3s;white-space:nowrap;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

function copyText(btn) {
  const text = btn.getAttribute('data-text') || btn.closest('.msg')?.querySelector('.msg-text')?.textContent;
  if (text) navigator.clipboard.writeText(text).then(() => showToast('কপি হয়েছে ✓'));
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ──────────────────────────────────────────────
// GENERATE PWA ICONS (canvas-based)
// ──────────────────────────────────────────────
function generatePWAIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,size,size);
  grad.addColorStop(0,'#00bcd4'); grad.addColorStop(1,'#001f3f');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${size*0.4}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('P', size/2, size/2);
  return canvas.toDataURL('image/png');
}

// ──────────────────────────────────────────────
// EXPOSE TO WINDOW
// ──────────────────────────────────────────────
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.newChat = newChat;
window.sendMessage = sendMessage;
window.toggleMic = toggleMic;
window.startAudioCall = startAudioCall;
window.endAudioCall = endAudioCall;
window.startVideoCall = startVideoCall;
window.endVideoCall = endVideoCall;
window.flipCamera = flipCamera;
window.triggerImageUpload = triggerImageUpload;
window.triggerCameraCapture = triggerCameraCapture;
window.handleImageFile = handleImageFile;
window.closeImagePreview = closeImagePreview;
window.testVoice = testVoice;
window.saveAndCheckKey = saveAndCheckKey;
window.uploadAssets = uploadAssets;

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
