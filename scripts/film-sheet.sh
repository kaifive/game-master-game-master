#!/bin/sh
# Turns a video into a Tap Masher film (spec 16): FRAMES frames sampled evenly
# across it, tiled COLUMNS wide on one JPEG sprite sheet. Needs ffmpeg and ffprobe.
#
#   sh scripts/film-sheet.sh input.mov public/events/<event>/tap-form/form.jpg [FRAMES] [COLUMNS] [WIDTH]
#
# Then set the game's content.film to { sheet, frames, columns, width, height, alt },
# where width and height are one frame's size (printed below).
set -eu
in=$1
out=$2
frames=${3:-50}
columns=${4:-10}
width=${5:-320}
rows=$(( (frames + columns - 1) / columns ))
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
i=0
while [ "$i" -lt "$frames" ]; do
  # The middle of each of FRAMES equal slices of the video.
  t=$(awk -v i="$i" -v d="$duration" -v n="$frames" 'BEGIN { printf "%.3f", (i + 0.5) * d / n }')
  ffmpeg -v error -ss "$t" -i "$in" -frames:v 1 -vf "scale=$width:-2" -y "$tmp/$(printf %03d "$i").png"
  i=$((i + 1))
done
mkdir -p "$(dirname "$out")"
ffmpeg -v error -framerate 1 -i "$tmp/%03d.png" -vf "tile=${columns}x${rows}" -frames:v 1 -q:v 5 -y "$out"
echo "frame: $(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0 "$tmp/000.png") · sheet: $out ($(du -h "$out" | cut -f1))"
