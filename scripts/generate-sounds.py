"""Generate completion-sound candidates with the ElevenLabs sound-effects API.

    make sound-candidates                 # every concept, VARIANTS each
    python3 scripts/generate-sounds.py komuz bowl   # only these concepts

The API key comes from $ELEVENLABS_API_KEY or ~/.config/elevenlabs/api_key and is never printed.
Output goes to build/sound-candidates/<n>-<slug>/vK.mp3 (gitignored) for listening; the picked
files are copied into assets/sounds/ by hand afterwards.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build" / "sound-candidates"
API = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128"
MODEL = "eleven_text_to_sound_v3"   # the API default is eleven_text_to_sound_v2
VARIANTS = 2
DURATION = 1.2         # seconds; a completion cue should be over almost as soon as it starts
PROMPT_INFLUENCE = 0.6

COMMON = ("short UI notification sound for a task finishing, soft and pleasant, quick attack, "
          "short natural decay, clean, no voice, no music bed, no background noise, not harsh")
# (slug, prompt, duration override in seconds or None)
CONCEPTS = [
    ("glass", "A single soft glass chime, gentle crystal ding", None),
    ("marimba", "A warm two-note marimba phrase, rising, wooden and mellow", None),
    ("komuz", "A calm, short song intro played on a komuz, the Kyrgyz three-string lute: two or "
              "three gently strummed chords in sequence at a slow, relaxed pace, softly resolving on a "
              "final quiet ringing chord, warm mellow wooden tone, peaceful and unhurried, solo "
              "instrument only. Clean recording, no voice, no other instruments, no percussion, no "
              "background noise", 1.8),
    ("bowl", "A gentle tibetan singing bowl ding, soft strike, warm resonant tone", None),
]


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        path = Path.home() / ".config" / "elevenlabs" / "api_key"
        if path.exists():
            key = path.read_text().strip()
    if not key:
        sys.exit("No ElevenLabs API key: set ELEVENLABS_API_KEY or save it to ~/.config/elevenlabs/api_key")
    return key


def generate(key, text, duration):
    body = json.dumps({"text": text, "model_id": MODEL, "duration_seconds": duration,
                       "prompt_influence": PROMPT_INFLUENCE}).encode()
    req = urllib.request.Request(API, data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json",
                                          "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        sys.exit(f"ElevenLabs returned HTTP {e.code}: {detail}")


def main():
    wanted = set(sys.argv[1:])
    key = api_key()
    for n, (slug, prompt, duration) in enumerate(CONCEPTS, 1):
        if wanted and slug not in wanted:
            continue
        folder = OUT / f"{n}-{slug}"
        folder.mkdir(parents=True, exist_ok=True)
        # Never overwrite earlier candidates: continue numbering after the existing vK.mp3 files.
        start = len(list(folder.glob("v*.mp3"))) + 1
        for v in range(start, start + VARIANTS):
            path = folder / f"v{v}.mp3"
            # Longer phrases (a duration override) carry their own full description; the short UI
            # cues share COMMON.
            text = f"{prompt}." if duration else f"{prompt}. {COMMON}."
            path.write_bytes(generate(key, text, duration or DURATION))
            print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
