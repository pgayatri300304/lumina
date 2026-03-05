# 🌿 Lumina — AI Mental Health Companion

> A Gen AI project for 2026 — empathetic, elegant, and deeply functional.

## What is Lumina?

Lumina is an AI-powered mental health companion that combines Claude AI with a beautiful, therapeutic interface. It provides:

- **Emotion Analysis** — Real-time detection of your emotional state with CBT techniques
- **AI Therapy Chat** — Conversational mental health support powered by Claude
- **Reflective Journaling** — Guided journaling with gratitude practice
- **Breathing Sanctuary** — 3 science-backed breathing exercises (Box, 4-7-8, Calm)
- **Wellness Insights** — AI-generated patterns and personalized affirmations

## Tech Stack

- **Backend:** Python Flask
- **AI:** Anthropic Claude (claude-sonnet-4-20250514)
- **Frontend:** Pure HTML, CSS, JavaScript
- **Design:** Dark organic luxury aesthetic with ambient animations

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set your API key
```bash
# Mac/Linux
export ANTHROPIC_API_KEY=your_key_here

# Windows
set ANTHROPIC_API_KEY=your_key_here
```

### 3. Run the app
```bash
python app.py
```

### 4. Open in browser
```
http://localhost:5000
```

## Features in Detail

| Feature | Description |
|---------|-------------|
| Home Check-in | Type how you feel, get emotion analysis + coping technique |
| AI Companion | Multi-turn therapy chat with context memory |
| Journal | Daily prompts, mood tagging, gratitude logging |
| Breathe | Box / 4-7-8 / Calm breath with animated guide |
| Insights | AI-synthesized patterns from your mood history |

## Important Note
Lumina is a supportive AI companion, not a replacement for professional mental health care. Crisis resources are always available in the Insights tab.

---
Built with ❤️ using Flask + Claude API
