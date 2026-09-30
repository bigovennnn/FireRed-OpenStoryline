#!/usr/bin/env bash
# Build the explainer: frames (headless Chromium) + synthesized audio -> MP4.
# Needs: node + playwright (Chromium), python3 + numpy, ffmpeg (or `pip install imageio-ffmpeg`).
set -euo pipefail
cd "$(dirname "$0")"
WORK=${WORK:-./build}
mkdir -p "$WORK/frames"
FFMPEG=${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())')}

node render.js "$WORK/frames" --workers "${WORKERS:-4}"
python3 audio.py "$WORK/soundtrack.wav"
"$FFMPEG" -y -framerate 30 -i "$WORK/frames/f%05d.png" -i "$WORK/soundtrack.wav" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -tune animation \
  -c:a aac -b:a 160k -shortest -movflags +faststart openstoryline_explainer.mp4
echo "-> $(pwd)/openstoryline_explainer.mp4"
