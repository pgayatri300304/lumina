// ===== LUMINA — MAIN JAVASCRIPT =====

// ===== STATE =====
const state = {
  chatHistory: [],
  moodLog: [],
  journalEntries: [],
  selectedMood: null,
  sessionStart: Date.now(),
  messageCount: 0,
  breatheActive: false,
  breatheTimer: null,
  currentTech: 'box',
  currentCycle: 0,
  breathePhase: null
};

const EMOTIONS = {
  joy: { emoji: '😊', color: '#87c38f' },
  sadness: { emoji: '😢', color: '#7ba8c4' },
  anxiety: { emoji: '😰', color: '#e8a598' },
  anger: { emoji: '🔥', color: '#e87d6b' },
  neutral: { emoji: '😐', color: '#a0a0a0' },
  hope: { emoji: '🌱', color: '#87c38f' },
  fear: { emoji: '😨', color: '#b89ee8' },
  overwhelmed: { emoji: '🌊', color: '#4ecdc4' }
};

const PROMPTS = [
  "What is one thing that challenged you today, and what did you learn from it?",
  "Describe a moment today when you felt most like yourself.",
  "What emotion has been most present today? Where do you feel it in your body?",
  "What would you tell a dear friend who was feeling exactly how you feel right now?",
  "What is one small act of kindness you showed yourself or others today?",
  "What are you carrying that you'd like to put down for a while?",
  "If your current feelings were weather, what would the forecast look like?",
  "What part of yourself are you learning to accept right now?",
  "What does your body need today that it hasn't received yet?",
  "Write about a memory that brought you unexpected comfort recently."
];

const BREATHE_TECHNIQUES = {
  box: {
    name: "Box Breathing",
    desc: "Used by Navy SEALs and therapists worldwide. Equalizes the nervous system and brings immediate calm.",
    phases: [
      { label: 'Inhale', duration: 4, class: 'inhale' },
      { label: 'Hold', duration: 4, class: 'hold' },
      { label: 'Exhale', duration: 4, class: 'exhale' },
      { label: 'Hold', duration: 4, class: 'hold' }
    ],
    cycles: 4
  },
  '478': {
    name: "4-7-8 Breathing",
    desc: "Dr. Andrew Weil's technique for anxiety relief. Activates the parasympathetic nervous system within minutes.",
    phases: [
      { label: 'Inhale', duration: 4, class: 'inhale' },
      { label: 'Hold', duration: 7, class: 'hold' },
      { label: 'Exhale', duration: 8, class: 'exhale' }
    ],
    cycles: 4
  },
  calm: {
    name: "Calm Breath",
    desc: "Gentle rhythmic breathing for moments of overwhelm. Simple, accessible, and deeply soothing.",
    phases: [
      { label: 'Breathe in', duration: 5, class: 'inhale' },
      { label: 'Breathe out', duration: 5, class: 'exhale' }
    ],
    cycles: 6
  }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initTime();
  initCheckin();
  initChat();
  initJournal();
  updateSessionTimer();
  loadMoodLog();
});

// ===== LIVE TIME =====
function initTime() {
  const el = document.getElementById('liveTime');
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  update();
  setInterval(update, 1000);
}

// ===== TAB NAVIGATION =====
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    switchTab(target);
  });
});

function switchTab(name) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  
  const tab = document.querySelector(`[data-tab="${name}"]`);
  const section = document.getElementById(`tab-${name}`);
  
  if (tab) tab.classList.add('active');
  if (section) section.classList.add('active');

  if (name === 'insights') renderMoodChart();
  if (name === 'journal') updateJournalDate();
}

// ===== CHECK-IN =====
function initCheckin() {
  const input = document.getElementById('checkinInput');
  const counter = document.getElementById('charCount');
  
  input.addEventListener('input', () => {
    const len = input.value.length;
    counter.textContent = Math.min(len, 500);
    if (len > 500) input.value = input.value.slice(0, 500);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) analyzeEmotion();
  });

  document.getElementById('analyzeBtn').addEventListener('click', analyzeEmotion);
}

async function analyzeEmotion() {
  const text = document.getElementById('checkinInput').value.trim();
  if (!text) return;

  const btn = document.getElementById('analyzeBtn');
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Reflecting...';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    displayEmotionResult(data);
    state.moodLog.push({
      timestamp: new Date().toISOString(),
      emotion: data.emotion,
      intensity: data.intensity
    });
    updateMoodBars();
  } catch (err) {
    console.error(err);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Analyze & Reflect';
  }
}

function displayEmotionResult(data) {
  const result = document.getElementById('emotionResult');
  const emotion = data.emotion || 'neutral';
  const info = EMOTIONS[emotion] || EMOTIONS.neutral;

  document.getElementById('emotionEmoji').textContent = info.emoji;
  document.getElementById('emotionLabel').textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
  
  const pct = ((data.intensity || 5) / 10) * 100;
  document.getElementById('intensityFill').style.width = '0%';
  setTimeout(() => {
    document.getElementById('intensityFill').style.width = pct + '%';
  }, 100);
  document.getElementById('intensityNum').textContent = data.intensity || '—';

  document.getElementById('luminaResponse').textContent = data.response || '';
  document.getElementById('techniqueName').textContent = data.technique || '';
  document.getElementById('techniqueDesc').textContent = data.technique_desc || '';
  document.getElementById('affirmationText').textContent = data.affirmation || '';

  result.style.display = 'block';
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== CHAT =====
function initChat() {
  const input = document.getElementById('chatInput');
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

function updateSessionTimer() {
  setInterval(() => {
    const mins = Math.floor((Date.now() - state.sessionStart) / 60000);
    const el = document.getElementById('sessionTime');
    if (el) el.textContent = `${mins}m`;
  }, 10000);
}

function useStarter(btn) {
  document.getElementById('chatInput').value = btn.textContent;
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);
  state.chatHistory.push({ role: 'user', content: text });
  state.messageCount++;
  document.getElementById('msgCount').textContent = state.messageCount;

  document.getElementById('typingIndicator').style.display = 'flex';
  document.getElementById('sendBtn').disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: state.chatHistory.slice(-10) })
    });
    const data = await res.json();
    
    document.getElementById('typingIndicator').style.display = 'none';
    addMessage('lumina', data.reply);
    state.chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    document.getElementById('typingIndicator').style.display = 'none';
    addMessage('lumina', 'I seem to be having a moment of disconnection. Please breathe with me and try again.');
  } finally {
    document.getElementById('sendBtn').disabled = false;
  }
}

function addMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-message ${role === 'user' ? 'user-msg' : 'lumina-msg'}`;
  
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  div.innerHTML = `
    ${role === 'lumina' ? '<div class="msg-avatar">✦</div>' : ''}
    <div class="msg-bubble">
      <p>${escapeHtml(text)}</p>
      <div class="msg-time">${now}</div>
    </div>
    ${role === 'user' ? '<div class="msg-avatar" style="background:rgba(244,162,97,0.1);border-color:rgba(244,162,97,0.3);color:var(--amber)">You</div>' : ''}
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function clearChat() {
  state.chatHistory = [];
  state.messageCount = 0;
  document.getElementById('msgCount').textContent = '0';
  const container = document.getElementById('chatMessages');
  container.innerHTML = `
    <div class="chat-message lumina-msg">
      <div class="msg-avatar">✦</div>
      <div class="msg-bubble">
        <p>Hello again. This is your safe space — no judgment, no rush. What's on your mind? 🌿</p>
        <div class="msg-time">Just now</div>
      </div>
    </div>
  `;
}

// ===== JOURNAL =====
function initJournal() {
  updateJournalDate();
  refreshPrompt();
}

function updateJournalDate() {
  const el = document.getElementById('journalDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function selectMood(btn) {
  document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedMood = btn.dataset.mood;
}

function refreshPrompt() {
  const el = document.getElementById('journalPrompt');
  const idx = Math.floor(Math.random() * PROMPTS.length);
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = PROMPTS[idx];
    el.style.opacity = '1';
  }, 200);
  el.style.transition = 'opacity 0.2s';
}

async function saveJournal() {
  const text = document.getElementById('journalText').value.trim();
  const grat = [
    document.getElementById('grat1').value,
    document.getElementById('grat2').value,
    document.getElementById('grat3').value
  ].filter(g => g.trim());

  if (!text && grat.length === 0) return;

  try {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text, mood: state.selectedMood || 'neutral', gratitude: grat
      })
    });
    const data = await res.json();
    state.journalEntries.push(data.entry);

    const conf = document.getElementById('saveConfirmation');
    conf.style.display = 'block';
    setTimeout(() => conf.style.display = 'none', 3000);

    document.getElementById('journalText').value = '';
    document.getElementById('grat1').value = '';
    document.getElementById('grat2').value = '';
    document.getElementById('grat3').value = '';
    document.querySelectorAll('.mood-opt').forEach(b => b.classList.remove('selected'));
    state.selectedMood = null;
    refreshPrompt();
  } catch (err) {
    console.error(err);
  }
}

// ===== BREATHING =====
function selectTech(btn, tech) {
  document.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.currentTech = tech;
  
  const t = BREATHE_TECHNIQUES[tech];
  document.getElementById('breatheTechName').textContent = t.name;
  document.getElementById('breatheTechDesc').textContent = t.desc;
  document.getElementById('cycleTotal').textContent = t.cycles;
  document.getElementById('cycleNum').textContent = '0';

  if (state.breatheActive) stopBreath();
  document.getElementById('breatheInstruction').textContent = 'Press Start';
  document.getElementById('breatheCount').textContent = '';
  document.getElementById('breatheBtn').textContent = 'Begin';
}

function toggleBreath() {
  if (state.breatheActive) {
    stopBreath();
  } else {
    startBreath();
  }
}

function startBreath() {
  state.breatheActive = true;
  state.currentCycle = 0;
  document.getElementById('breatheBtn').textContent = 'Stop';
  document.getElementById('breatheBenefit').textContent = 'Breathing deeply activates your vagus nerve...';
  runBreathCycle();
}

function stopBreath() {
  state.breatheActive = false;
  if (state.breatheTimer) clearTimeout(state.breatheTimer);
  document.getElementById('breatheBtn').textContent = 'Begin';
  document.getElementById('breatheInstruction').textContent = 'Well done 🌿';
  document.getElementById('breatheCount').textContent = '';
  document.getElementById('breatheBenefit').textContent = 'Take a moment to notice how you feel';
  document.getElementById('breatheCircle').className = 'breathe-circle';
}

function runBreathCycle() {
  const tech = BREATHE_TECHNIQUES[state.currentTech];
  if (!state.breatheActive) return;

  if (state.currentCycle >= tech.cycles) {
    stopBreath();
    document.getElementById('breatheInstruction').textContent = 'Complete ✨';
    document.getElementById('breatheBenefit').textContent = 'Your nervous system thanks you';
    return;
  }

  state.currentCycle++;
  document.getElementById('cycleNum').textContent = state.currentCycle;

  runPhases(tech.phases, 0, () => runBreathCycle());
}

function runPhases(phases, idx, onComplete) {
  if (!state.breatheActive || idx >= phases.length) {
    if (onComplete && state.breatheActive) onComplete();
    return;
  }

  const phase = phases[idx];
  document.getElementById('breatheInstruction').textContent = phase.label;
  document.getElementById('breatheCircle').className = `breathe-circle ${phase.class}`;

  let count = phase.duration;
  document.getElementById('breatheCount').textContent = count;

  const tick = setInterval(() => {
    if (!state.breatheActive) { clearInterval(tick); return; }
    count--;
    document.getElementById('breatheCount').textContent = count || '';
    if (count <= 0) {
      clearInterval(tick);
      runPhases(phases, idx + 1, onComplete);
    }
  }, 1000);
  
  state.breatheTimer = tick;
}

// ===== INSIGHTS =====
async function loadInsights() {
  const btn = document.querySelector('.btn-insights');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mood_data: state.moodLog,
        journal_entries: state.journalEntries
      })
    });
    const data = await res.json();

    document.getElementById('insightPattern').textContent = data.pattern;
    document.getElementById('insightStrength').textContent = data.strength;
    document.getElementById('insightSuggestion').textContent = data.suggestion;
    document.getElementById('insightAffirmation').textContent = data.affirmation;

    const grid = document.getElementById('insightsGrid');
    grid.style.display = 'grid';
    grid.style.animation = 'fadeUp 0.5s ease';
  } catch (err) {
    console.error(err);
  } finally {
    btn.textContent = 'Generate AI Insights ✦';
    btn.disabled = false;
  }
}

async function loadMoodLog() {
  try {
    const res = await fetch('/api/mood-log');
    const data = await res.json();
    if (data && data.length) {
      state.moodLog = data;
      updateMoodBars();
    }
  } catch (e) {}
}

function updateMoodBars() {
  if (!state.moodLog.length) return;

  const counts = {};
  state.moodLog.forEach(entry => {
    counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
  });

  const max = Math.max(...Object.values(counts));
  const container = document.getElementById('moodBars');
  
  const emotionNames = { joy: '😊 Joy', sadness: '😢 Sadness', anxiety: '😰 Anxiety', 
                          anger: '🔥 Anger', neutral: '😐 Neutral', hope: '🌱 Hope', 
                          fear: '😨 Fear', overwhelmed: '🌊 Overwhelmed' };

  container.innerHTML = '';
  Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([emotion, count]) => {
    const pct = (count / max) * 100;
    container.innerHTML += `
      <div class="mood-bar-item">
        <div class="mood-bar-label">${emotionNames[emotion] || emotion}</div>
        <div class="mood-bar-track"><div class="mood-bar-fill" style="width:${pct}%"></div></div>
        <div class="mood-bar-count">${count}</div>
      </div>
    `;
  });
}

function renderMoodChart() {
  const canvas = document.getElementById('moodChart');
  const noData = document.getElementById('noChartData');
  
  if (!state.moodLog.length) { noData.style.display = 'flex'; return; }
  noData.style.display = 'none';

  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const pad = { t: 20, r: 20, b: 40, l: 40 };

  ctx.clearRect(0, 0, w, h);

  const emotionScale = { joy: 9, hope: 8, neutral: 5, anxiety: 4, fear: 3, sadness: 3, anger: 2, overwhelmed: 2 };
  const recent = state.moodLog.slice(-14);
  const vals = recent.map(e => e.intensity || emotionScale[e.emotion] || 5);

  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }

  // Gradient fill
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, 'rgba(78,205,196,0.3)');
  grad.addColorStop(1, 'rgba(78,205,196,0)');

  // Line
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = pad.l + (i / (vals.length - 1)) * chartW;
    const y = pad.t + chartH - ((v / 10) * chartH);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#4ecdc4';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Fill
  ctx.lineTo(pad.l + chartW, h - pad.b);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.fillStyle = grad;
  ctx.fill();

  // Dots
  vals.forEach((v, i) => {
    const x = pad.l + (i / (vals.length - 1)) * chartW;
    const y = pad.t + chartH - ((v / 10) * chartH);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
    ctx.strokeStyle = '#0a0f0e';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Labels
  ctx.fillStyle = 'rgba(240,237,232,0.3)';
  ctx.font = '10px Space Mono, monospace';
  ctx.textAlign = 'center';
  recent.forEach((entry, i) => {
    const x = pad.l + (i / (vals.length - 1)) * chartW;
    const time = new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (i % Math.ceil(recent.length / 5) === 0) ctx.fillText(time, x, h - 8);
  });
}

// ===== UTILITY =====
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
