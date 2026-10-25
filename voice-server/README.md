# Voicebox Voice Cloning Server for Smriti

This server implements the zero-shot voice cloning technology from **[Jamie Pine's Voicebox](https://github.com/jamiepine/voicebox)**:

- **Flagship Engine:** **Qwen3-TTS** (`1.7B` & `0.6B`) — Zero-shot speaker cloning from short reference audio clips with natural language delivery control (`instruct`).
- **Expressive Engine:** **Chatterbox Multilingual** — Zero-shot voice cloner across 23 languages with paralinguistic tags (`[laugh]`, `[sigh]`, `[gasp]`, `[whisper]`).
- **Instant Engine:** **Voicebox Resonant Timbre Synthesizer** — Zero-latency acoustic timbre matching that clones fundamental pitch, harmonics, and vocal warmth locally on any machine without needing a high-end GPU.
- **Audio Pipeline:**
  - Multi-sample combining (aggregates multiple voice clips, normalizes loudness via RMS, merges transcripts).
  - Sentence-boundary chunking with abbreviation protection (`split_text_into_chunks`).
  - Crossfaded audio concatenation (`crossfade_audio`).

---

## 🚀 Option 1: Free Google Colab GPU (Recommended for Qwen3-TTS 1.7B)

1. Open [Google Colab](https://colab.research.google.com) and create a notebook.
2. Select **Runtime → Change runtime type → T4 GPU**.
3. Upload `main.py` and `voicebox_colab_runner.py` from this folder.
4. Run:
   ```python
   !python voicebox_colab_runner.py
   ```
5. It will print a public Cloudflare URL (e.g., `https://example-random.trycloudflare.com`).
6. Set that URL in your `.env.local`:
   ```env
   VOICE_SERVER_URL=https://example-random.trycloudflare.com
   VOICE_SERVER_SECRET=smriti-dev-secret-2025
   ```

---

## 💻 Option 2: Running Locally (Windows, Mac, Linux)

Works on any Python version (including **Python 3.10, 3.11, 3.12, and 3.13**).

```powershell
pip install -r requirements.txt
python main.py
```

The server will start on `http://localhost:8000`.

Set in your `.env.local`:
```env
VOICE_SERVER_URL=http://localhost:8000
VOICE_SERVER_SECRET=smriti-dev-secret-2025
```

---

## 📡 API Endpoints

- `GET /health` — Check server status, active hardware (CUDA/CPU), and loaded engines.
- `GET /engines` — List all Voicebox zero-shot cloning engines.
- `POST /register-speaker` — Upload reference audio WAV and transcript to create or update a voice profile.
- `POST /speak` or `POST /generate` — Synthesize cloned speech for text with optional delivery instructions.
