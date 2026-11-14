#!/bin/sh
# Turns a video into a Tap Masher film (spec 16): FRAMES frames tiled COLUMNS
# wide on one JPEG sprite sheet. Needs ffmpeg and ffprobe.
#
#   sh scripts/film-sheet.sh input.mov out.jpg [FRAMES] [COLUMNS] [WIDTH] [START] [STEP]
#
# With START (seconds), the frames are consecutive from there, every STEP-th
# frame of the video (1 = every frame, 2 = skip one), so it plays like video.
# Without it, FRAMES frames are sampled evenly across the whole video.
#
# Then set the game's content.film to { sheet, frames, columns, width, height, alt },
# where width and height are one frame's size (printed below).
set -eu
in=$1
out=$2
frames=${3:-50}
columns=${4:-10}
width=${5:-320}
start=${6:-}
step=${7:-2}
rows=$(( (frames + columns - 1) / columns ))
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

if [ -n "$start" ]; then
  ffmpeg -v error -ss "$start" -i "$in" -vf "select=not(mod(n\,$step)),scale=$width:-2" \
    -fps_mode passthrough -frames:v "$frames" -y "$tmp/%03d.png"
  first=001
else
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
  i=0
  while [ "$i" -lt "$frames" ]; do
    # The middle of each of FRAMES equal slices of the video.
    t=$(awk -v i="$i" -v d="$duration" -v n="$frames" 'BEGIN { printf "%.3f", (i + 0.5) * d / n }')
    ffmpeg -v error -ss "$t" -i "$in" -frames:v 1 -vf "scale=$width:-2" -y "$tmp/$(printf %03d "$((i + 1))").png"
    i=$((i + 1))
  done
  first=001
fi
mkdir -p "$(dirname "$out")"
ffmpeg -v error -framerate 1 -start_number 1 -i "$tmp/%03d.png" -vf "tile=${columns}x${rows}" -frames:v 1 -q:v 6 -y "$out"
echo "frames: $(ls "$tmp" | wc -l) · frame: $(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$tmp/$first.png") · sheet: $out ($(du -h "$out" | cut -f1))"
