#!/usr/bin/env bash
# Ghép khung render (logo_scene.py -- anim) thành video cho trang giới thiệu.
#   hero-intro.mp4 : khung 1..150, đoạn mở màn (chạy một lần)
#   hero-loop.mp4  : khung 151..198, ba chấm "đang gõ" (lặp liền mạch, chu kỳ 48 khung)
#   hero-start.webp, hero-end.webp : khung đầu và khung cuối, hiện trong lúc video đang tải
set -e
cd "$(dirname "$0")"
F=out/frames/f_%04d.png
D=../public/gioi-thieu
mkdir -p "$D"
X264="-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -an"
ffmpeg -loglevel error -y -framerate 30 -start_number 1 -i $F -frames:v 150 $X264 "$D/hero-intro.mp4"
ffmpeg -loglevel error -y -framerate 30 -start_number 151 -i $F -frames:v 48 $X264 "$D/hero-loop.mp4"
ffmpeg -loglevel error -y -i out/frames/f_0001.png -c:v libwebp -quality 86 "$D/hero-start.webp"
ffmpeg -loglevel error -y -i out/frames/f_0198.png -c:v libwebp -quality 86 "$D/hero-end.webp"
ls -la "$D"
