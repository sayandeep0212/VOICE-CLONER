import sys
import json
import os
import soundfile as sf

def main():
    filepath = None
    for arg in reversed(sys.argv[1:]):
        if not arg.startswith("-") and os.path.exists(arg):
            filepath = arg
            break

    if not filepath:
        print(json.dumps({"streams": [], "format": {}}))
        return

    try:
        info = sf.info(filepath)
        duration = float(info.duration)
        sr = int(info.samplerate)
        channels = int(info.channels)
        format_name = str(info.format).lower()
        subtype = str(info.subtype).lower()
        size = os.path.getsize(filepath)

        codec_name = "pcm_s16le"
        if "opus" in subtype or "opus" in format_name:
            codec_name = "opus"
        elif "vorbis" in subtype:
            codec_name = "vorbis"
        elif "flac" in subtype:
            codec_name = "flac"
        elif "pcm_24" in subtype:
            codec_name = "pcm_s24le"
        elif "pcm_32" in subtype or "float" in subtype:
            codec_name = "pcm_f32le"

        # Pydub expects a Stream line in stderr
        sys.stderr.write(f"    Stream #0:0: Audio: {codec_name}, {sr} Hz, {'mono' if channels == 1 else 'stereo'}, s16 (16 bit)\n")
        sys.stderr.flush()

        result = {
            "streams": [{
                "index": 0,
                "codec_name": codec_name,
                "codec_type": "audio",
                "sample_fmt": "s16",
                "sample_rate": str(sr),
                "channels": channels,
                "channel_layout": "mono" if channels == 1 else "stereo",
                "bits_per_sample": 16,
                "bits_per_raw_sample": 16,
                "duration": str(duration),
                "bit_rate": str(int(size * 8 / max(0.1, duration)))
            }],
            "format": {
                "filename": filepath,
                "nb_streams": 1,
                "format_name": format_name,
                "format_long_name": f"{format_name} audio",
                "duration": str(duration),
                "size": str(size),
                "bit_rate": str(int(size * 8 / max(0.1, duration)))
            }
        }
        print(json.dumps(result))
    except Exception:
        sys.stderr.write("    Stream #0:0: Audio: pcm_s16le, 24000 Hz, mono, s16 (16 bit)\n")
        sys.stderr.flush()
        fallback = {
            "streams": [{
                "index": 0,
                "codec_name": "pcm_s16le",
                "codec_type": "audio",
                "sample_fmt": "s16",
                "sample_rate": "24000",
                "channels": 1,
                "channel_layout": "mono",
                "bits_per_sample": 16,
                "duration": "10.0",
                "bit_rate": "384000"
            }],
            "format": {
                "filename": filepath,
                "nb_streams": 1,
                "format_name": "wav",
                "duration": "10.0",
                "size": "1000",
                "bit_rate": "384000"
            }
        }
        print(json.dumps(fallback))

if __name__ == "__main__":
    main()
