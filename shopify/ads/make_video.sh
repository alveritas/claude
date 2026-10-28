#!/bin/bash
# 9:16 slideshow from the rendered frames: 6 pieces at 1.8s, end card 3s, 0.35s fades, slow push-in, silent audio track.
set -e
S=/tmp/claude-0/-home-claude/4e64af7f-c720-5453-a93a-efbeb74b2ef8/scratchpad
cd $S/ads/frames; D=1.8; E=3.0; T=0.35; FPS=30
args=""; for i in 0 1 2 3 4 5; do args="$args -loop 1 -t $D -i f$i.jpg"; done; args="$args -loop 1 -t $E -i f6.jpg"
f=""; for i in 0 1 2 3 4 5 6; do d=$D; [ $i = 6 ] && d=$E; n=$(python3 -c "print(int($d*$FPS))"); f="$f[$i:v]scale=1188:2112,zoompan=z='min(zoom+0.0007,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$n:s=1080x1920:fps=$FPS,setsar=1,format=yuv420p[v$i];"; done
off=$(python3 -c "print($D-$T)"); f="$f[v0][v1]xfade=transition=fade:duration=$T:offset=$off[x1];"
for i in 2 3 4 5 6; do off=$(python3 -c "print(round(($D-$T)*$i,3))"); f="$f[x$((i-1))][v$i]xfade=transition=fade:duration=$T:offset=$off[x$i];"; done
ffmpeg -y -loglevel error $args -f lavfi -t 12 -i anullsrc=r=44100:cl=stereo -filter_complex "${f%;}" -map "[x6]" -map 7:a -t 12 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -r $FPS -c:a aac -b:a 128k -movflags +faststart $S/ads/out/neverhollow-drop001-video-9x16.mp4
