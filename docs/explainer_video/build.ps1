# Windows build: frames (headless Chromium) + synthesized audio -> MP4.
# Usage (PowerShell, in this folder):  .\build.ps1
# If scripts are blocked:  powershell -ExecutionPolicy Bypass -File .\build.ps1
# One-time setup:  npm install playwright ; npx playwright install chromium ; pip install numpy imageio-ffmpeg
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$work = if ($env:WORK) { $env:WORK } else { 'build' }
$workers = if ($env:WORKERS) { $env:WORKERS } else { 4 }
New-Item -ItemType Directory -Force -Path "$work\frames" | Out-Null

$ff = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ff) { $ff = (python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())").Trim() }

node render.js "$work\frames" --workers $workers
if ($LASTEXITCODE) { throw 'render.js failed' }
python audio.py "$work\soundtrack.wav"
if ($LASTEXITCODE) { throw 'audio.py failed' }
& $ff -y -framerate 30 -i "$work\frames\f%05d.png" -i "$work\soundtrack.wav" `
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -tune animation `
  -c:a aac -b:a 160k -shortest -movflags +faststart openstoryline_explainer.mp4
if ($LASTEXITCODE) { throw 'ffmpeg failed' }
Write-Host "-> $PWD\openstoryline_explainer.mp4"
