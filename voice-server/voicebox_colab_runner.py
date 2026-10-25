"""
Voicebox Colab Runner
====================
Run this script inside a free Google Colab notebook (T4 GPU runtime)
to host your Voicebox Zero-Shot Voice Cloning Engine for free!

Instructions:
1. Open https://colab.research.google.com and create a new notebook.
2. Select Runtime -> Change runtime type -> T4 GPU.
3. Paste and run this script.
4. Copy the generated public URL into your web app's .env.local as:
   VOICE_SERVER_URL=https://your-tunnel-url.trycloudflare.com
"""

import subprocess
import sys
import os

print("=== Setting up Voicebox Zero-Shot Voice Cloning Environment ===")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "fastapi", "uvicorn", "python-multipart", "qwen-tts", "chatterbox-tts", "torch", "soundfile", "numpy"], check=True)

# Install cloudflared for free public HTTPS tunnel
print("=== Setting up Cloudflare Tunnel ===")
os.system("wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb")
os.system("dpkg -i cloudflared-linux-amd64.deb")

# Run Cloudflare Tunnel in background
import threading
import time
import re

def start_tunnel():
    proc = subprocess.Popen(["cloudflared", "tunnel", "--url", "http://localhost:8000"], stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    for line in proc.stderr:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            print("\n" + "="*60)
            print("🚀 YOUR VOICEBOX VOICE SERVER IS PUBLICLY ACCESSIBLE AT:")
            print(match.group(0))
            print("Put this URL in your web app .env.local:")
            print(f"VOICE_SERVER_URL={match.group(0)}")
            print("="*60 + "\n")
            break

threading.Thread(target=start_tunnel, daemon=True).start()
time.sleep(2)

# Start Voicebox FastAPI server
from main import app
import uvicorn
uvicorn.run(app, host="0.0.0.0", port=8000)
