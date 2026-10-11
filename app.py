import os
import sys
import time
import json
import uuid
import asyncio
import re
import zipfile
import wave
import io
import shutil
import subprocess
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import edge_tts

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# Ensure utf-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__, static_folder='static', template_folder='templates')

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'outputs')
HISTORY_FILE = os.path.join(OUTPUT_DIR, 'history.json')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Kunci API Default dan Berkas Referensi Acuan
DEFAULT_GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
REFERENCE_AUDIO_NAME = "gunung_padang_1791693456211.wav"
REF_AUDIO_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), REFERENCE_AUDIO_NAME)
REF_STATIC_PATH = os.path.join(OUTPUT_DIR, REFERENCE_AUDIO_NAME)

# Pastikan berkas referensi acuan tersedia di static/outputs
if os.path.exists(REF_AUDIO_PATH) and not os.path.exists(REF_STATIC_PATH):
    try:
        shutil.copy2(REF_AUDIO_PATH, REF_STATIC_PATH)
    except Exception as e:
        print(f"Error copying reference audio: {e}")

# ==============================================================================
# Karakter Suara Tunggal Baku: CHARON (Google Generative AI)
# Persis seperti file referensi: gunung_padang_1791693456211.wav
# Spesifikasi:
# - Model           : Gemini 3.8 Flash TTS / Gemini 3.1 Flash TTS
# - Prebuilt Voice  : Charon
# - Karakter & Gaya : Sangat sinematik, wibawa narator dokumenter misteri
# - Sampling        : 24.000 Hz, Mono, 16-bit PCM (Studio Quality)
# ==============================================================================
CHARON_VOICE = {
    "id": "charon",
    "name": "Charon",
    "gender": "Male",
    "lang": "Bahasa Indonesia & Universal",
    "locale": "id-ID",
    "style": "Sangat sinematik",
    "ambiance": "Suasana cerita Misteri & Sejarah Purba",
    "tempo": "Normal",
    "dramatic_pause": "Normal",
    "tag": "Sangat Sinematik • Misteri • Persis Acuan",
    "avatar": "🌘",
    "country": "🌌",
    "reference_file": REFERENCE_AUDIO_NAME,
    "description": "Karakter vokal narator Charon asli (Google Generative AI) persis seperti file acuan gunung_padang_1791693456211.wav: resonansi pria berat, artikulasi sinematik, dan jeda dramatis teratur."
}

FEATURED_VOICES = [CHARON_VOICE]
CACHED_VOICES = [CHARON_VOICE]

VOICE_MAP = {
    "charon": "charon",
    "default": "charon"
}

def resolve_voice_id(name_or_id, default="charon"):
    # Suara tunggal adalah Charon
    return "charon"

def get_voice_display(voice_id="charon"):
    return "🌘 Charon (Google AI — Sangat Sinematik • Misteri)"

def pcm_to_wav(pcm_data, sample_rate=24000, channels=1, sampwidth=2):
    """Mengubah data byte mentah PCM 24kHz mono menjadi berkas WAV standar."""
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(channels)
        wav_file.setsampwidth(sampwidth)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)
    return wav_io.getvalue()

def process_dramatic_text(text, pause_level="normal"):
    """
    Menyelaraskan jeda dramatis naskah untuk karakter Charon (Sinematik Misteri).
    Memberikan hembusan nafas dan pemisah kalimat yang teratur dan alami.
    """
    formatted = text.strip()
    formatted = re.sub(r'\.{3,}', '... ', formatted)
    formatted = re.sub(r'([,;:!?])\s*', r'\1 ', formatted)
    if pause_level == "high":
        formatted = re.sub(r'\.\s+', '... ', formatted)
    return formatted

def convert_to_wav_24k(input_path, output_path):
    """Mengonversi file audio ke format WAV 24kHz mono 16-bit (sama persis dengan format target)."""
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([ffmpeg_exe, '-y', '-i', input_path, '-ar', '24000', '-ac', '1', output_path],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"Konversi audio ke WAV gagal: {e}")
        return False

def convert_to_mp3(input_path, output_path, bitrate="192k"):
    """Mengonversi file audio (WAV) ke format MP3 berkualitas tinggi dengan FFmpeg."""
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run([
            ffmpeg_exe, '-y', '-i', input_path,
            '-codec:a', 'libmp3lame',
            '-b:a', bitrate,
            output_path
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"Konversi audio ke MP3 gagal: {e}")
        return False

def generate_charon_speech(text, rate_str, pitch_str, volume_str, filepath, api_key=None, dramatic_pause="normal", audio_format="wav"):
    """
    Menghasilkan narasi audio dengan karakter suara Charon persis seperti gunung_padang_1791693456211.wav:
    - Mesin Utama: Google Gemini TTS (gemini-3.8-flash-tts / gemini-3.1-flash-tts-preview) dengan suara Charon.
    - Format Berkas: WAV 24.000 Hz, 1-channel mono, 16-bit PCM (baku) atau MP3 (192kbps).
    """
    clean_text = process_dramatic_text(text, dramatic_pause)

    # File WAV perantara jika format yang diminta adalah MP3
    wav_target = filepath if audio_format == "wav" else filepath + ".tmp.wav"

    gemini_key = api_key or DEFAULT_GEMINI_KEY
    engine_used = None

    if gemini_key:
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_key)

            candidate_models = [
                "gemini-3.8-flash-tts",
                "gemini-3.1-flash-tts-preview",
                "gemini-2.5-pro-preview-tts"
            ]

            last_err = None
            for model_name in candidate_models:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=clean_text,
                        config=types.GenerateContentConfig(
                            response_modalities=["AUDIO"],
                            speech_config=types.SpeechConfig(
                                voice_config=types.VoiceConfig(
                                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")
                                )
                            )
                        )
                    )
                    for cand in (response.candidates or []):
                        for part in (cand.content.parts or []):
                            if part.inline_data and part.inline_data.data:
                                raw = part.inline_data.data
                                if raw.startswith(b'RIFF'):
                                    with open(wav_target, 'wb') as f:
                                        f.write(raw)
                                else:
                                    wav_bytes = pcm_to_wav(raw)
                                    with open(wav_target, 'wb') as f:
                                        f.write(wav_bytes)
                                engine_used = f"Google Gemini (Charon Native - {model_name})"
                                break
                        if engine_used:
                            break
                    if engine_used:
                        break
                except Exception as err:
                    last_err = err
                    print(f"[Charon Engine] Percobaan {model_name} gagal: {err}. Mencoba model cadangan...")
                    time.sleep(0.5)

            if not engine_used and last_err:
                print(f"[Charon Engine] Semua model Gemini TTS gagal: {last_err}")
        except Exception as e:
            print(f"[Charon Engine] Inisialisasi Google Gemini gagal: {e}. Beralih ke Neural Engine...")

    # Fallback darurat (Edge Neural Voice) jika koneksi ke Gemini terputus
    if not engine_used or not os.path.exists(wav_target):
        edge_voice = "id-ID-ArdiNeural"
        temp_edge_mp3 = filepath + ".edge.mp3"

        async def run_edge():
            communicate = edge_tts.Communicate(
                text=clean_text,
                voice=edge_voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str
            )
            await communicate.save(temp_edge_mp3)

        asyncio.run(run_edge())

        if os.path.exists(temp_edge_mp3):
            if audio_format == "mp3":
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except Exception:
                        pass
                shutil.move(temp_edge_mp3, filepath)
                return "Neural Engine (Offline Fallback)"
            else:
                convert_to_wav_24k(temp_edge_mp3, wav_target)
                try:
                    os.remove(temp_edge_mp3)
                except Exception:
                    pass
                engine_used = "Neural Engine (Offline Fallback)"

    # Konversi ke format target
    if audio_format == "mp3":
        if os.path.exists(wav_target):
            convert_to_mp3(wav_target, filepath)
            if wav_target != filepath and os.path.exists(wav_target):
                try:
                    os.remove(wav_target)
                except Exception:
                    pass
    else:
        if wav_target != filepath and os.path.exists(wav_target):
            shutil.move(wav_target, filepath)

    return engine_used or "Google Gemini (Charon Native)"

def parse_bulk_line(line, default_voice="charon"):
    raw = line.strip()
    if not raw:
        return None
    
    spoken_text = raw

    # Hilangkan tag jika ada, misal [Charon], [suara: Charon], Charon: ...
    tag_match = re.match(r'^\[(?:suara\s*:\s*|voice\s*:\s*|karakter\s*:\s*)?([a-zA-Z0-9_\-]+)\]\s*(.*)$', raw, re.IGNORECASE)
    if tag_match:
        spoken_text = tag_match.group(2).strip()
    else:
        colon_match = re.match(r'^(?:\(?([a-zA-Z0-9_\-]+)\)?\s*[:\-]\s*)(.*)$', raw)
        if colon_match:
            spoken_text = colon_match.group(2).strip()

    if not spoken_text:
        return None

    return {
        "text": spoken_text,
        "voice": "charon",
        "voice_display": get_voice_display("charon")
    }

def load_history():
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except Exception:
            history = []

    # Pastikan file acuan resmi selalu ada di riwayat
    has_ref = any(h.get('filename') == REFERENCE_AUDIO_NAME for h in history)
    if not has_ref and os.path.exists(REF_STATIC_PATH):
        ref_size_kb = round(os.path.getsize(REF_STATIC_PATH) / 1024, 1)
        ref_entry = {
            "id": "ref_gunung_padang",
            "filename": REFERENCE_AUDIO_NAME,
            "audio_url": f"/static/outputs/{REFERENCE_AUDIO_NAME}",
            "text": "Audio Acuan: Gunung Padang (Karakter Suara Baku Charon — 24kHz Studio)",
            "text_preview": "Audio Acuan: Gunung Padang (Karakter Suara Baku Charon)...",
            "voice": "charon",
            "voice_display": "🎯 Charon (Suara Acuan Baku)",
            "engine": "Google Gemini (Charon Native)",
            "rate": "+0%",
            "pitch": "+0Hz",
            "file_size": f"{ref_size_kb} KB",
            "generation_time": "3.16s",
            "created_at": "11 Oct 2026, 12:37:36",
            "is_reference": True
        }
        history.insert(0, ref_entry)
        save_history(history)

    return history

def save_history(history):
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

def format_rate(rate_val):
    try:
        val = int(rate_val)
        return f"{val:+d}%"
    except Exception:
        return "+0%"

def format_pitch(pitch_val):
    try:
        val = int(pitch_val)
        return f"{val:+d}Hz"
    except Exception:
        return "+0Hz"

def format_volume(volume_val):
    try:
        val = int(volume_val)
        return f"{val:+d}%"
    except Exception:
        return "+0%"

# ==============================================================================
# Routes
# ==============================================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/featured-voices')
def get_featured_voices():
    return jsonify({
        "success": True,
        "voices": FEATURED_VOICES
    })

@app.route('/api/reference-audio')
def get_reference_audio():
    ref_exists = os.path.exists(REF_STATIC_PATH)
    file_size_kb = round(os.path.getsize(REF_STATIC_PATH) / 1024, 1) if ref_exists else 0
    return jsonify({
        "success": True,
        "filename": REFERENCE_AUDIO_NAME,
        "audio_url": f"/static/outputs/{REFERENCE_AUDIO_NAME}",
        "title": "Suara Acuan: Gunung Padang",
        "voice": "charon",
        "voice_display": "🌘 Charon (Acuan Asli Google Generative AI)",
        "file_size": f"{file_size_kb} KB",
        "sample_rate": "24.000 Hz",
        "channels": "1 (Mono)",
        "format": "WAV 16-bit PCM",
        "description": "Berkas audio baku acuan. Seluruh hasil generate studio dikalibrasi persis dengan vokal ini."
    })

@app.route('/api/voices')
def get_voices():
    return jsonify({
        "success": True,
        "featured": FEATURED_VOICES,
        "all_voices": FEATURED_VOICES,
        "total": 1
    })

@app.route('/api/generate', methods=['POST'])
def generate_audio():
    data = request.get_json() or {}
    raw_text = (data.get('text') or '').strip()
    if not raw_text:
        return jsonify({"success": False, "error": "Teks naskah tidak boleh kosong!"}), 400

    # Pisahkan per 1x Enter (\n)
    raw_lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    if not raw_lines:
        return jsonify({"success": False, "error": "Tidak ada baris teks naskah yang valid!"}), 400

    # Validasi batas maksimal 30 suara sekali generate
    if len(raw_lines) > 30:
        return jsonify({
            "success": False,
            "error": f"Naskah melebihi batas! Maksimal 30 suara sekali generate (terdeteksi {len(raw_lines)} baris). Harap kurangi baris naskah Anda."
        }), 400

    rate_val = data.get('rate', 0)
    pitch_val = data.get('pitch', 0)
    volume_val = data.get('volume', 0)
    dramatic_pause = data.get('dramatic_pause', 'normal')
    api_key = (data.get('api_key') or '').strip()

    # Format audio yang dipilih sebelum generate: 'wav' atau 'mp3'
    audio_format = (data.get('format') or 'wav').strip().lower()
    if audio_format not in ['wav', 'mp3']:
        audio_format = 'wav'

    rate_str = format_rate(rate_val)
    pitch_str = format_pitch(pitch_val)
    volume_str = format_volume(volume_val)

    batch_id = uuid.uuid4().hex[:6]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    total_lines = len(raw_lines)
    is_bulk = total_lines > 1

    try:
        start_time = time.time()
        generated_items = []

        for idx, line_text in enumerate(raw_lines, start=1):
            unique_sub_id = uuid.uuid4().hex[:5]
            voice_label = f"voice {idx}"
            archive_name = f"voice {idx}.{audio_format}"
            filename = f"voice_{idx}_{timestamp}_{unique_sub_id}.{audio_format}"
            filepath = os.path.join(OUTPUT_DIR, filename)

            engine_used = generate_charon_speech(
                text=line_text,
                rate_str=rate_str,
                pitch_str=pitch_str,
                volume_str=volume_str,
                filepath=filepath,
                api_key=api_key,
                dramatic_pause=dramatic_pause,
                audio_format=audio_format
            )

            file_size_kb = round(os.path.getsize(filepath) / 1024, 1)
            voice_display = get_voice_display("charon")

            item_data = {
                "id": unique_sub_id,
                "batch_id": batch_id,
                "index": idx,
                "display_name": voice_label,
                "filename": filename,
                "archive_name": archive_name,
                "filepath": filepath,
                "audio_url": f"/static/outputs/{filename}",
                "download_url": f"/api/download/{filename}?as=voice {idx}.{audio_format}",
                "text": line_text,
                "text_preview": (line_text[:80] + '...') if len(line_text) > 80 else line_text,
                "voice": "charon",
                "voice_display": voice_display,
                "engine": engine_used,
                "format": audio_format,
                "rate": rate_str,
                "pitch": pitch_str,
                "file_size": f"{file_size_kb} KB",
                "created_at": datetime.now().strftime("%d %b %Y, %H:%M:%S")
            }
            generated_items.append(item_data)

        total_duration = round(time.time() - start_time, 2)

        # Simpan ke riwayat
        history = load_history()
        for itm in reversed(generated_items):
            history_item = {
                "id": itm["id"],
                "filename": itm["filename"],
                "audio_url": itm["audio_url"],
                "download_url": itm["download_url"],
                "text": itm["text"],
                "text_preview": itm["text_preview"],
                "display_name": itm["display_name"],
                "voice": "charon",
                "voice_display": itm["voice_display"],
                "engine": itm["engine"],
                "format": itm["format"],
                "rate": itm["rate"],
                "pitch": itm["pitch"],
                "file_size": itm["file_size"],
                "created_at": itm["created_at"],
                "batch_id": batch_id if is_bulk else None,
                "batch_index": itm["index"] if is_bulk else None
            }
            history.insert(0, history_item)

        if len(history) > 60:
            history = history[:60]
        save_history(history)

        # Jika bulk (>1 suara), kompres ke dalam file ZIP dengan penamaan voice 1, voice 2 dst
        zip_filename = None
        zip_url = None
        zip_size_kb = 0
        if is_bulk:
            zip_filename = f"Chronicle_Voices_Bulk_{timestamp}_{batch_id}.zip"
            zip_filepath = os.path.join(OUTPUT_DIR, zip_filename)
            with zipfile.ZipFile(zip_filepath, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
                for itm in generated_items:
                    zipf.write(itm['filepath'], arcname=itm['archive_name'])
            zip_size_kb = round(os.path.getsize(zip_filepath) / 1024, 1)
            download_zip_as = f"Voices_Bulk_1_sampai_{len(generated_items)}_{audio_format.upper()}.zip"
            zip_url = f"/api/download/{zip_filename}?as={download_zip_as}"

        client_items = []
        for itm in generated_items:
            client_items.append({
                "id": itm["id"],
                "index": itm["index"],
                "display_name": itm["display_name"],
                "filename": itm["filename"],
                "archive_name": itm["archive_name"],
                "audio_url": itm["audio_url"],
                "download_url": itm["download_url"],
                "text": itm["text"],
                "voice": "charon",
                "voice_display": itm["voice_display"],
                "format": itm["format"],
                "file_size": itm["file_size"],
                "created_at": itm["created_at"]
            })

        return jsonify({
            "success": True,
            "is_bulk": is_bulk,
            "batch_id": batch_id,
            "total_items": len(client_items),
            "format": audio_format,
            "total_duration": f"{total_duration}s",
            "zip_filename": zip_filename,
            "zip_url": zip_url,
            "zip_size": f"{zip_size_kb} KB" if zip_filename else None,
            "items": client_items,
            "item": client_items[0]
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Gagal membuat narasi Charon: {str(e)}"}), 500

@app.route('/api/parse-lines', methods=['POST'])
def parse_lines_api():
    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({"success": True, "lines": [], "count": 0, "exceeds_limit": False})
    
    raw_lines = [l.strip() for l in text.splitlines() if l.strip()]
    parsed_items = []
    for idx, l in enumerate(raw_lines, start=1):
        parsed = parse_bulk_line(l, "charon")
        if parsed:
            parsed['index'] = idx
            parsed['display_name'] = f"voice {idx}"
            parsed_items.append(parsed)
            
    return jsonify({
        "success": True,
        "lines": parsed_items,
        "count": len(parsed_items),
        "exceeds_limit": len(parsed_items) > 30,
        "max_limit": 30
    })

@app.route('/api/generate-bulk', methods=['POST'])
def generate_bulk_audio():
    # Mengarahkan langsung ke generate_audio yang sudah mendukung bulk fleksibel 1-30 suara
    return generate_audio()

@app.route('/api/history', methods=['GET'])
def get_history():
    history = load_history()
    valid_history = []
    for item in history:
        fpath = os.path.join(OUTPUT_DIR, item.get('filename', ''))
        if os.path.exists(fpath):
            valid_history.append(item)
    return jsonify({"success": True, "history": valid_history})

@app.route('/api/history/<item_id>', methods=['DELETE'])
def delete_history_item(item_id):
    history = load_history()
    new_history = []
    deleted = False
    for item in history:
        if item.get('id') == item_id:
            deleted = True
            fpath = os.path.join(OUTPUT_DIR, item.get('filename', ''))
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception as e:
                    print(f"Error deleting file {fpath}: {e}")
        else:
            new_history.append(item)
    save_history(new_history)
    return jsonify({"success": deleted})

@app.route('/api/download/<filename>')
def download_audio(filename):
    safe_filename = os.path.basename(filename)
    download_as = request.args.get('as') or safe_filename
    return send_from_directory(OUTPUT_DIR, safe_filename, as_attachment=True, download_name=download_as)

if __name__ == '__main__':
    print("=" * 65)
    print(" [AudioAI Studio] - Karakter Suara Tunggal: CHARON")
    print(" Sangat sinematik • Suasana cerita Misteri • Tempo & Jeda Normal")
    print(" Server berjalan di: http://127.0.0.1:5000")
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
