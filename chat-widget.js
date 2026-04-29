/* ============================================================
   Mr & Mrs Lifestyle — AI Chat Widget
   Drop this file in your repo root, then add to every HTML:
   <script src="chat-widget.js" defer></script>
   ============================================================ */

(function () {
  const WA_NUMBER = "971507871515";
  const WA_MSG = encodeURIComponent("Hi Tarek & Chloe! I was chatting with your website assistant and I'd love to book a free strategy call 💪");
  const WA_URL = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

  const GOLD = "#C9A84C";
  const BLACK = "#0A0A0A";
  const CHARCOAL = "#1A1A1A";
  const WHITE = "#FFFFFF";

  /* ── SYSTEM PROMPT ── */
  const SYSTEM_PROMPT = `You are the friendly AI assistant for Mr & Mrs Lifestyle — Dubai's premier coaching couple, Tarek Elzamek and Chloe Antoniazzi.

Your job: answer questions about coaching, packages, and fitness — then encourage the visitor to book a free WhatsApp strategy call.

KEY FACTS:
- Tarek specialises in men's fat loss, muscle gain, body recomposition, strength training
- Chloe specialises in women's fitness, glutes development, pre/postnatal training, pilates
- 500+ clients transformed, 10+ years experience, 30+ countries coached
- Based in Dubai, train at Nogs Gym and FitnGlam (ladies only)
- Online coaching available worldwide

PACKAGES:
- Economy Pack: AED 299/month — custom workout plan, macro targets, email support
- Elite Coaching: AED 899/month — fully personalised training + nutrition, weekly check-in calls, 24/7 WhatsApp access (MOST POPULAR)
- VIP Programme: AED 1,999/month — everything in Elite plus bi-weekly video sessions, supplement protocol, priority response
- Booty Builder: AED 649 — women's glutes focus
- Ultimate Muscle Gain: AED 480 — men's muscle building
- Ultimate Fat Burn: AED 480 — fat loss programme
- Couples Package: AED 1,499/month — both partners coached together
- 14-day money-back guarantee on all packages
- Free strategy call before any commitment

TONE: Warm, motivating, knowledgeable. Like a friend who happens to be an expert. Keep replies concise — 2-4 sentences max. End most replies by nudging toward the free WhatsApp call.

IMPORTANT: Never make up facts. If unsure, say "Great question — Tarek or Chloe can answer that personally on your free call!"

After 2-3 exchanges, always suggest booking the free WhatsApp strategy call.`;

  /* ── QUICK REPLIES ── */
  const QUICK_REPLIES = [
    "What packages do you offer?",
    "How does online coaching work?",
    "I want to lose fat in Dubai",
    "I'm a woman looking to tone up",
    "Do you coach couples?",
    "How much does it cost?",
  ];

  /* ── INJECT CSS ── */
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');

    #mnml-chat-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; }

    #mnml-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 62px; height: 62px; border-radius: 50%;
      background: ${GOLD}; border: none; cursor: pointer;
      box-shadow: 0 4px 24px rgba(201,168,76,0.5), 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
      animation: mnml-pulse 3s ease-in-out infinite;
    }
    #mnml-chat-btn:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(201,168,76,0.7); }
    #mnml-chat-btn svg { width: 28px; height: 28px; transition: opacity 0.2s; }
    #mnml-chat-btn .icon-close { display: none; }
    #mnml-chat-btn.open .icon-chat { display: none; }
    #mnml-chat-btn.open .icon-close { display: block; }
    #mnml-chat-btn.open { animation: none; }

    @keyframes mnml-pulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(201,168,76,0.5), 0 0 0 0 rgba(201,168,76,0.4); }
      50% { box-shadow: 0 4px 24px rgba(201,168,76,0.5), 0 0 0 12px rgba(201,168,76,0); }
    }

    #mnml-chat-bubble {
      position: fixed; bottom: 102px; right: 28px; z-index: 9998;
      background: ${CHARCOAL}; color: ${WHITE};
      border: 1px solid rgba(201,168,76,0.3); border-radius: 12px 12px 2px 12px;
      padding: 0.65rem 1rem; font-size: 0.8rem; font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      white-space: nowrap; pointer-events: none;
      animation: mnml-bubble-in 0.4s 2s both;
    }
    #mnml-chat-bubble::after {
      content: ''; position: absolute; bottom: -6px; right: 18px;
      width: 12px; height: 12px; background: ${CHARCOAL};
      border-right: 1px solid rgba(201,168,76,0.3);
      border-bottom: 1px solid rgba(201,168,76,0.3);
      transform: rotate(45deg);
    }
    @keyframes mnml-bubble-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:translateY(0); } }

    #mnml-chat-window {
      position: fixed; bottom: 102px; right: 28px; z-index: 9998;
      width: 360px; max-width: calc(100vw - 40px);
      height: 520px; max-height: calc(100vh - 140px);
      background: ${CHARCOAL}; border: 1px solid rgba(201,168,76,0.25);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1);
      display: none; flex-direction: column;
      transform: scale(0.92) translateY(16px); opacity: 0;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.25s ease;
    }
    #mnml-chat-window.visible {
      display: flex; transform: scale(1) translateY(0); opacity: 1;
    }

    #mnml-chat-header {
      background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05));
      border-bottom: 1px solid rgba(201,168,76,0.2);
      padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.85rem; flex-shrink: 0;
    }
    .mnml-avatar-group { display: flex; flex-direction: row; }
    .mnml-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: ${GOLD}; border: 2px solid ${CHARCOAL};
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif; font-size: 0.85rem;
      font-weight: 700; color: ${BLACK}; flex-shrink: 0;
    }
    .mnml-avatar:last-child { margin-left: -10px; }
    .mnml-header-info { flex: 1; }
    .mnml-header-name { font-family: 'Playfair Display', serif; font-size: 0.95rem; font-weight: 700; color: ${WHITE}; }
    .mnml-header-status { font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 0.1rem; display: flex; align-items: center; gap: 0.35rem; }
    .mnml-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #2ecc71; flex-shrink: 0; animation: mnml-blink 2s ease-in-out infinite; }
    @keyframes mnml-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .mnml-wa-btn-small {
      display: flex; align-items: center; gap: 0.4rem;
      background: #25D366; color: #fff; border: none; border-radius: 20px;
      padding: 0.4rem 0.85rem; font-size: 0.72rem; font-weight: 700;
      cursor: pointer; text-decoration: none; letter-spacing: 0.03em;
      transition: filter 0.2s; flex-shrink: 0;
    }
    .mnml-wa-btn-small:hover { filter: brightness(1.1); }

    #mnml-chat-messages {
      flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
      scroll-behavior: smooth;
    }
    #mnml-chat-messages::-webkit-scrollbar { width: 4px; }
    #mnml-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #mnml-chat-messages::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }

    .mnml-msg { max-width: 85%; display: flex; flex-direction: column; gap: 0.2rem; animation: mnml-msg-in 0.3s ease; }
    @keyframes mnml-msg-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .mnml-msg.user { align-self: flex-end; align-items: flex-end; }
    .mnml-msg.bot { align-self: flex-start; align-items: flex-start; }
    .mnml-bubble {
      padding: 0.65rem 0.9rem; border-radius: 12px; font-size: 0.87rem; line-height: 1.55;
    }
    .mnml-msg.user .mnml-bubble { background: ${GOLD}; color: ${BLACK}; border-radius: 12px 12px 2px 12px; font-weight: 500; }
    .mnml-msg.bot .mnml-bubble { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); border-radius: 12px 12px 12px 2px; border: 1px solid rgba(255,255,255,0.08); }

    .mnml-typing { display: flex; align-items: center; gap: 4px; padding: 0.75rem 0.9rem; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px 12px 12px 2px; width: fit-content; }
    .mnml-typing span { width: 6px; height: 6px; border-radius: 50%; background: ${GOLD}; opacity: 0.4; animation: mnml-typing 1.2s ease-in-out infinite; }
    .mnml-typing span:nth-child(2) { animation-delay: 0.2s; }
    .mnml-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes mnml-typing { 0%,100%{opacity:0.4;transform:translateY(0)} 50%{opacity:1;transform:translateY(-3px)} }

    #mnml-quick-replies {
      display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.5rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    }
    .mnml-qr {
      background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.25);
      color: rgba(255,255,255,0.8); border-radius: 20px; padding: 0.35rem 0.75rem;
      font-size: 0.73rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
    }
    .mnml-qr:hover { background: rgba(201,168,76,0.2); border-color: ${GOLD}; color: ${WHITE}; }

    #mnml-chat-footer {
      padding: 0.75rem 1rem; border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; gap: 0.5rem; flex-shrink: 0;
    }
    #mnml-chat-input {
      flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px; padding: 0.6rem 1rem; color: ${WHITE};
      font-family: 'DM Sans', sans-serif; font-size: 0.87rem; outline: none;
      transition: border-color 0.2s;
    }
    #mnml-chat-input::placeholder { color: rgba(255,255,255,0.3); }
    #mnml-chat-input:focus { border-color: rgba(201,168,76,0.5); }
    #mnml-send-btn {
      width: 40px; height: 40px; border-radius: 50%; background: ${GOLD};
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.2s, transform 0.15s;
    }
    #mnml-send-btn:hover { background: #E8D08A; transform: scale(1.05); }
    #mnml-send-btn svg { width: 18px; height: 18px; }

    .mnml-wa-cta {
      display: flex; align-items: center; gap: 0.6rem;
      background: rgba(37,211,102,0.1); border: 1px solid rgba(37,211,102,0.3);
      border-radius: 10px; padding: 0.75rem 0.9rem; margin-top: 0.25rem;
      text-decoration: none; transition: background 0.2s;
    }
    .mnml-wa-cta:hover { background: rgba(37,211,102,0.18); }
    .mnml-wa-cta-text { font-size: 0.82rem; font-weight: 600; color: #2ecc71; }
    .mnml-wa-cta-sub { font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 0.1rem; }

    @media (max-width: 480px) {
      #mnml-chat-window { right: 12px; bottom: 90px; width: calc(100vw - 24px); }
      #mnml-chat-btn { right: 16px; bottom: 20px; }
      #mnml-chat-bubble { right: 12px; bottom: 96px; }
    }
  `;
  document.head.appendChild(style);

  /* ── BUILD HTML ── */
  const wrapper = document.createElement("div");
  wrapper.id = "mnml-chat-widget";
  wrapper.innerHTML = `
    <div id="mnml-chat-bubble">💬 Ask us anything about coaching!</div>

    <div id="mnml-chat-window">
      <div id="mnml-chat-header">
        <div class="mnml-avatar-group">
          <div class="mnml-avatar">T</div>
          <div class="mnml-avatar">C</div>
        </div>
        <div class="mnml-header-info">
          <div class="mnml-header-name">Tarek & Chloe</div>
          <div class="mnml-header-status"><span class="mnml-status-dot"></span> AI Assistant · Online now</div>
        </div>
        <a href="${WA_URL}" target="_blank" class="mnml-wa-btn-small">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
      </div>

      <div id="mnml-chat-messages"></div>

      <div id="mnml-quick-replies"></div>

      <div id="mnml-chat-footer">
        <input id="mnml-chat-input" type="text" placeholder="Ask about coaching, packages..." autocomplete="off">
        <button id="mnml-send-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>

    <button id="mnml-chat-btn" aria-label="Open chat">
      <svg class="icon-chat" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  document.body.appendChild(wrapper);

  /* ── ELEMENTS ── */
  const btn = document.getElementById("mnml-chat-btn");
  const win = document.getElementById("mnml-chat-window");
  const msgs = document.getElementById("mnml-chat-messages");
  const input = document.getElementById("mnml-chat-input");
  const sendBtn = document.getElementById("mnml-send-btn");
  const qrContainer = document.getElementById("mnml-quick-replies");
  const bubble = document.getElementById("mnml-chat-bubble");

  let isOpen = false;
  let messageHistory = [];
  let exchangeCount = 0;
  let bubbleHidden = false;

  /* ── TOGGLE ── */
  btn.addEventListener("click", () => {
    isOpen = !isOpen;
    btn.classList.toggle("open", isOpen);
    if (isOpen) {
      bubble.style.display = "none";
      win.style.display = "flex";
      requestAnimationFrame(() => win.classList.add("visible"));
      if (msgs.children.length === 0) showWelcome();
      setTimeout(() => input.focus(), 300);
    } else {
      win.classList.remove("visible");
      setTimeout(() => { win.style.display = "none"; }, 300);
    }
  });

  /* ── HIDE BUBBLE ON SCROLL ── */
  window.addEventListener("scroll", () => {
    if (!bubbleHidden) { bubble.style.display = "none"; bubbleHidden = true; }
  }, { passive: true });

  /* ── WELCOME MESSAGE ── */
  function showWelcome() {
    addBotMessage("Hey! 👋 I'm the Mr & Mrs Lifestyle AI assistant. I can answer questions about our coaching programmes, packages, and how we can help you transform. What would you like to know?");
    showQuickReplies();
  }

  /* ── QUICK REPLIES ── */
  function showQuickReplies() {
    qrContainer.innerHTML = "";
    QUICK_REPLIES.forEach(q => {
      const chip = document.createElement("button");
      chip.className = "mnml-qr";
      chip.textContent = q;
      chip.addEventListener("click", () => { sendMessage(q); qrContainer.innerHTML = ""; });
      qrContainer.appendChild(chip);
    });
  }

  /* ── ADD MESSAGES ── */
  function addBotMessage(text, showWA = false) {
    const msg = document.createElement("div");
    msg.className = "mnml-msg bot";
    msg.innerHTML = `<div class="mnml-bubble">${text}</div>`;
    if (showWA) {
      const wa = document.createElement("a");
      wa.href = WA_URL;
      wa.target = "_blank";
      wa.className = "mnml-wa-cta";
      wa.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <div>
          <div class="mnml-wa-cta-text">Book Free Strategy Call on WhatsApp</div>
          <div class="mnml-wa-cta-sub">Tarek or Chloe will reply personally</div>
        </div>`;
      msg.appendChild(wa);
    }
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "mnml-msg user";
    msg.innerHTML = `<div class="mnml-bubble">${text}</div>`;
    msgs.appendChild(msg);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const t = document.createElement("div");
    t.className = "mnml-msg bot";
    t.id = "mnml-typing";
    t.innerHTML = `<div class="mnml-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
    return t;
  }

  /* ── SEND MESSAGE ── */
  async function sendMessage(text) {
    text = text.trim();
    if (!text) return;
    input.value = "";
    qrContainer.innerHTML = "";
    addUserMessage(text);
    exchangeCount++;

    messageHistory.push({ role: "user", content: text });

    const typing = showTyping();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: messageHistory
        })
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Great question! Tarek or Chloe can answer that personally — tap the WhatsApp button above to reach them directly 💪";

      messageHistory.push({ role: "assistant", content: reply });
      typing.remove();

      const showWACard = exchangeCount >= 2;
      addBotMessage(reply, showWACard);

    } catch (err) {
      typing.remove();
      addBotMessage("Sorry, I'm having a moment! Reach Tarek & Chloe directly on WhatsApp — they'll get back to you personally 💪", true);
    }

    msgs.scrollTop = msgs.scrollHeight;
  }

  /* ── EVENTS ── */
  sendBtn.addEventListener("click", () => sendMessage(input.value));
  input.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(input.value); });

})();
