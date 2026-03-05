from flask import Flask, render_template, request, jsonify, session
import anthropic
import json
import datetime
import os
import uuid

app = Flask(__name__)
app.secret_key = os.urandom(24)

client = anthropic.Anthropic()

EMOTION_SYSTEM = """You are Lumina, an empathetic AI mental health companion. Analyze the user's message and respond with a JSON object containing:
{
  "emotion": "one of: joy, sadness, anxiety, anger, neutral, hope, fear, overwhelmed",
  "intensity": 1-10,
  "response": "your warm, therapeutic response (2-4 sentences)",
  "technique": "one CBT/mindfulness technique name",
  "technique_desc": "brief description of the technique",
  "affirmation": "a personalized positive affirmation"
}
Be genuinely empathetic, not clinical. Speak like a wise, caring friend who happens to have therapy training. Never be dismissive. Always validate feelings first."""

CHAT_SYSTEM = """You are Lumina, a compassionate AI mental health companion for 2026. You use evidence-based techniques from CBT, DBT, and mindfulness. You:
- Always validate emotions before offering perspective
- Ask thoughtful follow-up questions
- Suggest practical coping strategies when appropriate  
- Know when to recommend professional help
- Speak warmly, never robotically
- Remember context within the conversation
- Use gentle humor when appropriate
Keep responses conversational (3-5 sentences max unless elaborating on a technique)."""

@app.route('/')
def index():
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    if 'chat_history' not in session:
        session['chat_history'] = []
    if 'mood_log' not in session:
        session['mood_log'] = []
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_emotion():
    data = request.json
    text = data.get('text', '')
    
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": f"Analyze this and respond with JSON only: '{text}'"}],
            system=EMOTION_SYSTEM
        )
        
        raw = response.content[0].text.strip()
        # Clean JSON
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        result = json.loads(raw)
        
        # Log mood
        mood_entry = {
            "timestamp": datetime.datetime.now().isoformat(),
            "emotion": result.get("emotion", "neutral"),
            "intensity": result.get("intensity", 5),
            "text_snippet": text[:50]
        }
        if 'mood_log' not in session:
            session['mood_log'] = []
        session['mood_log'] = session['mood_log'][-29:] + [mood_entry]
        session.modified = True
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "emotion": "neutral", "intensity": 5,
                       "response": "I'm here with you. Tell me more about how you're feeling.",
                       "technique": "Deep Breathing", "technique_desc": "Take 3 slow deep breaths.",
                       "affirmation": "You are stronger than you know."})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    history = data.get('history', [])
    
    messages = []
    for msg in history[-10:]:
        messages.append({"role": msg['role'], "content": msg['content']})
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=CHAT_SYSTEM,
            messages=messages
        )
        reply = response.content[0].text
        return jsonify({"reply": reply, "success": True})
    except Exception as e:
        return jsonify({"reply": "I'm experiencing a moment of difficulty connecting. Please take a breath with me and try again.", "success": False})

@app.route('/api/mood-log', methods=['GET'])
def get_mood_log():
    return jsonify(session.get('mood_log', []))

@app.route('/api/journal', methods=['POST'])
def save_journal():
    data = request.json
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.datetime.now().isoformat(),
        "text": data.get('text', ''),
        "mood": data.get('mood', 'neutral'),
        "gratitude": data.get('gratitude', [])
    }
    if 'journal' not in session:
        session['journal'] = []
    session['journal'] = session['journal'][-19:] + [entry]
    session.modified = True
    return jsonify({"success": True, "entry": entry})

@app.route('/api/insights', methods=['POST'])
def get_insights():
    data = request.json
    mood_data = data.get('mood_data', [])
    journal_entries = data.get('journal_entries', [])
    
    prompt = f"""Based on this mood data: {json.dumps(mood_data[-7:])} and journal entries: {json.dumps(journal_entries[-5:])}, 
    provide a JSON response with:
    {{
      "pattern": "key emotional pattern observed in 1 sentence",
      "strength": "one genuine strength you see in the person",
      "suggestion": "one specific, actionable suggestion for this week",
      "affirmation": "a deeply personalized affirmation based on their journey"
    }}"""
    
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
            system="You are an insightful therapist. Respond only with valid JSON."
        )
        raw = response.content[0].text.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'): raw = raw[4:]
        return jsonify(json.loads(raw))
    except:
        return jsonify({"pattern": "You're showing up for yourself consistently.",
                       "strength": "Your willingness to reflect shows deep self-awareness.",
                       "suggestion": "Try 5 minutes of morning journaling this week.",
                       "affirmation": "Every step forward, no matter how small, matters."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
