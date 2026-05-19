"use client";

import { useEffect } from "react";

export default function ParisaAI() {
  useEffect(() => {
    // Initialize PARISA AI
    const script = document.createElement("script");
    script.src = "/app.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* Splash Screen */}
      <div id="splash">
        <div className="splash-inner">
          <div className="splash-logo-wrap">
            <div className="splash-logo-ring r3"></div>
            <div className="splash-logo-ring r2"></div>
            <div className="splash-logo-ring r1"></div>
            <div className="splash-logo" id="splashLogo">P</div>
          </div>
          <div className="splash-title">PARISA AI</div>
          <div className="splash-sub">আপনার ব্যক্তিগত সহকারী</div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div id="sidebarOverlay" className="overlay-bg hidden" onClick={() => (window as unknown as { closeSidebar: () => void }).closeSidebar?.()}></div>
      <div id="sidebar" className="sidebar hidden">
        <div className="sidebar-top">
          <button className="icon-btn" onClick={() => (window as unknown as { closeSidebar: () => void }).closeSidebar?.()}>&#10005;</button>
          <button className="new-chat-btn" onClick={() => (window as unknown as { newChat: () => void }).newChat?.()}>&#65291; নতুন চ্যাট</button>
        </div>
        <div id="chatList" className="chat-list"></div>
        <button className="settings-btn" onClick={() => (window as unknown as { openSettings: () => void }).openSettings?.()}>&#9881; সেটিংস</button>
      </div>

      {/* Main App */}
      <div id="app">
        {/* Header */}
        <div className="header">
          <button className="menu-btn" onClick={() => (window as unknown as { openSidebar: () => void }).openSidebar?.()}>&#8801;</button>
          <span className="header-title">PARISA AI</span>
          <div className="header-avatar" id="headerAvatarWrap">
            <img id="headerAvatarImg" src="" alt="P" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"); }} />
            <span className="avatar-fallback" id="headerFallback">P</span>
          </div>
        </div>

        {/* Chat Area */}
        <div id="chat">
          <div id="welcomeSection" className="welcome-section">
            <div className="main-avatar-wrap">
              <div className="main-avatar-ring"></div>
              <div className="main-avatar-inner">
                <img id="mainAvatarImg" src="" alt="P" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"); }} />
                <span className="avatar-fallback-big" id="mainFallback">P</span>
              </div>
            </div>
          </div>
          <div id="messages"></div>
        </div>

        {/* Input Bar */}
        <div className="input-bar">
          <button className="input-icon-btn" onClick={() => (window as unknown as { triggerImageUpload: () => void }).triggerImageUpload?.()} title="ছবি পাঠান">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <button className="input-icon-btn" onClick={() => (window as unknown as { triggerCameraCapture: () => void }).triggerCameraCapture?.()} title="ক্যামেরা">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <button className="input-icon-btn" onClick={() => (window as unknown as { startAudioCall: () => void }).startAudioCall?.()} title="অডিও কল">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.2 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
          </button>
          <button className="input-icon-btn" onClick={() => (window as unknown as { startVideoCall: () => void }).startVideoCall?.()} title="ভিডিও কল">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </button>
          <input type="text" id="textInput" placeholder="কিছু লিখুন বা জিজ্ঞাসা করুন..." onKeyDown={(e) => { if (e.key === "Enter") (window as unknown as { sendMessage: () => void }).sendMessage?.(); }} />
          <input type="file" id="imageFileInput" accept="image/*" style={{ display: "none" }} onChange={(e) => (window as unknown as { handleImageFile: (el: HTMLInputElement) => void }).handleImageFile?.(e.currentTarget)} />
          <input type="file" id="cameraInput" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => (window as unknown as { handleImageFile: (el: HTMLInputElement) => void }).handleImageFile?.(e.currentTarget)} />
          <button className="input-icon-btn mic-btn" onClick={() => (window as unknown as { toggleMic: () => void }).toggleMic?.()} id="micBtn" title="ভয়েস">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
          </button>
          <button className="send-btn" onClick={() => (window as unknown as { sendMessage: () => void }).sendMessage?.()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>

      {/* Audio Call Screen */}
      <div id="audioCall" className="call-screen hidden">
        <div className="call-top-info">
          <div className="call-name">পারিসা</div>
          <div className="call-status-text" id="callStatusText">সংযোগ হচ্ছে...</div>
          <div className="call-timer" id="callTimerDisplay">00:00</div>
        </div>
        <div className="logo-ball-area">
          <div className="ball-ring br3"></div>
          <div className="ball-ring br2"></div>
          <div className="ball-ring br1"></div>
          <div className="logo-ball" id="logoBall">
            <img id="callLogoImg" src="" alt="P" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"); }} />
            <span className="logo-ball-fallback" id="callFallback">P</span>
          </div>
        </div>
        <div className="call-controls">
          <button className="end-call-btn" onClick={() => (window as unknown as { endAudioCall: () => void }).endAudioCall?.()}>কল শেষ</button>
        </div>
      </div>

      {/* Video Call Screen */}
      <div id="videoCall" className="call-screen hidden">
        <video id="videoStream" autoPlay muted playsInline></video>
        <div className="video-top-bar">
          <div className="video-call-info">
            <div className="video-call-title">ভিডিও কল &bull; পারিসা</div>
            <div className="video-timer" id="videoTimerDisplay">00:00</div>
          </div>
          <div className="video-connected" id="videoStatusText">কানেক্টড</div>
        </div>
        <div className="video-controls">
          <button className="end-call-btn" onClick={() => (window as unknown as { endVideoCall: () => void }).endVideoCall?.()}>কল শেষ</button>
          <button className="flip-btn" onClick={() => (window as unknown as { flipCamera: () => void }).flipCamera?.()} title="ক্যামেরা ঘোরাও">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <div id="settingsOverlay" className="overlay-bg hidden" onClick={() => (window as unknown as { closeSettings: () => void }).closeSettings?.()}></div>
      <div id="settingsPanel" className="settings-panel hidden">
        <div className="settings-header">
          <span className="settings-title">সেটিংস</span>
          <button className="icon-btn" onClick={() => (window as unknown as { closeSettings: () => void }).closeSettings?.()}>&#10005;</button>
        </div>
        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">ভয়েস সিলেক্ট</label>
            <select id="voiceSelect" className="setting-select">
              <option value="bn-BD-NabanitaNeural">Nabanita &mdash; মহিলা (বাংলাদেশ)</option>
              <option value="bn-BD-PradeepNeural">Pradeep &mdash; পুরুষ (বাংলাদেশ)</option>
              <option value="bn-IN-TanishaaNeural">Tanishaa &mdash; মহিলা (ভারত)</option>
              <option value="bn-IN-BashkarNeural">Bashkar &mdash; পুরুষ (ভারত)</option>
            </select>
            <button className="test-btn" onClick={() => (window as unknown as { testVoice: () => void }).testVoice?.()}>টেস্ট করুন</button>
          </div>

          <div className="setting-group">
            <label className="setting-label">আপনার নাম (AI আপনাকে এই নামে ডাকবে)</label>
            <input type="text" id="settingUserName" className="setting-input" placeholder="দাদা" />
          </div>

          <div className="setting-group">
            <label className="setting-label">Custom Prompt &mdash; পারিসা আপনার সাথে কেমন আচরণ করবে</label>
            <textarea id="settingPrompt" className="setting-textarea" rows={5} placeholder="এখানে নির্দেশনা লিখুন..."></textarea>
            <small className="setting-hint">এখানে লেখা থাকলে এটাই AI-এর behavior ঠিক করবে। খালি রাখলে ডিফল্ট ব্যবহার হবে।</small>
            <div className="file-upload-box">
              <button className="upload-files-btn" onClick={() => document.getElementById("assetUploadInput")?.click()}>
                &#128193; ফাইল আপলোড করুন
              </button>
              <input type="file" id="assetUploadInput" multiple accept="*/*" style={{ display: "none" }} onChange={(e) => (window as unknown as { uploadAssets: (el: HTMLInputElement) => void }).uploadAssets?.(e.currentTarget)} />
              <div id="uploadedFileList" className="uploaded-file-list"></div>
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">লোগো URL (ইচ্ছিক)</label>
            <input type="text" id="settingLogoUrl" className="setting-input" placeholder="https://example.com/logo.jpg" />
          </div>

          <div className="setting-group api-keys-section">
            <div className="api-key-block">
              <div className="api-key-header-row">
                <span className="api-key-label">&#9889; Groq API Key</span>
                <span className="status-dot" id="groqStatusDot"></span>
              </div>
              <div className="api-key-input-row">
                <input type="password" id="groqKeyInput" className="setting-input" placeholder="gsk_xxxxxxxxxx" />
                <button className="check-btn" onClick={() => (window as unknown as { saveAndCheckKey: (type: string) => void }).saveAndCheckKey?.("groq")}>সেভ ও চেক</button>
              </div>
            </div>

            <div className="api-key-block">
              <div className="api-key-header-row">
                <span className="api-key-label">&#10024; Gemini API Key</span>
                <span className="status-dot" id="geminiStatusDot"></span>
              </div>
              <div className="api-key-input-row">
                <input type="password" id="geminiKeyInput" className="setting-input" placeholder="AIzaSy..." />
                <button className="check-btn" onClick={() => (window as unknown as { saveAndCheckKey: (type: string) => void }).saveAndCheckKey?.("gemini")}>সেভ ও চেক</button>
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="reset-btn" onClick={() => (window as unknown as { resetSettings: () => void }).resetSettings?.()}>রিসেট</button>
            <button className="save-btn" onClick={() => (window as unknown as { saveSettings: () => void }).saveSettings?.()}>সেভ</button>
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      <div id="imagePreviewOverlay" className="overlay-bg hidden" onClick={() => (window as unknown as { closeImagePreview: () => void }).closeImagePreview?.()}>
        <img id="imagePreviewImg" src="" alt="" />
      </div>
    </>
  );
}
