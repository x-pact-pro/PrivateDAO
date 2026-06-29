#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/docs/assets"
PUBLIC_ASSETS_DIR="$ROOT_DIR/apps/web/public/assets"
DESKTOP_DIR="/home/x-pact/Desktop/PrivateDAO-QVAC-Hackathon-Video"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUTPUT="$ASSETS_DIR/private-dao-qvac-hackathon-brander.mp4"
POSTER="$ASSETS_DIR/private-dao-qvac-hackathon-brander-poster.png"
PUBLIC_OUTPUT="$PUBLIC_ASSETS_DIR/private-dao-qvac-hackathon-brander.mp4"
PUBLIC_POSTER="$PUBLIC_ASSETS_DIR/private-dao-qvac-hackathon-brander-poster.png"
DESKTOP_OUTPUT="$DESKTOP_DIR/PrivateDAO - QVAC Hackathon Brander.mp4"
DESKTOP_POSTER="$DESKTOP_DIR/PrivateDAO - QVAC Hackathon Brander - Poster.png"
TMP_DIR="$ASSETS_DIR/qvac-video-tmp"

mkdir -p "$ASSETS_DIR" "$PUBLIC_ASSETS_DIR" "$DESKTOP_DIR" "$TMP_DIR"

write_text() {
  local file="$1"
  shift
  printf "%s\n" "$@" > "$file"
}

create_scene() {
  local index="$1"
  local eyebrow="$2"
  local title="$3"
  local line1="$4"
  local line2="$5"
  local line3="$6"
  local proof="$7"
  local accent="$8"
  local scene="$TMP_DIR/scene-${index}.png"
  local eyebrow_file="$TMP_DIR/eyebrow-${index}.txt"
  local title_file="$TMP_DIR/title-${index}.txt"
  local line1_file="$TMP_DIR/line1-${index}.txt"
  local line2_file="$TMP_DIR/line2-${index}.txt"
  local line3_file="$TMP_DIR/line3-${index}.txt"
  local proof_file="$TMP_DIR/proof-${index}.txt"

  write_text "$eyebrow_file" "$eyebrow"
  write_text "$title_file" "$title"
  write_text "$line1_file" "$line1"
  write_text "$line2_file" "$line2"
  write_text "$line3_file" "$line3"
  write_text "$proof_file" "$proof"

  ffmpeg -y -f lavfi -i "color=c=#05060C:s=1280x720" \
    -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x05060C:t=fill,drawbox=x=0:y=0:w=1280:h=720:color=0x101828@0.55:t=fill,drawbox=x=54:y=52:w=1172:h=616:color=0x07111E@0.88:t=fill,drawbox=x=54:y=52:w=1172:h=7:color=${accent}@0.95:t=fill,drawbox=x=92:y=94:w=242:h=42:color=${accent}@0.20:t=fill,drawtext=fontfile=$FONT_BOLD:textfile=$eyebrow_file:fontsize=22:fontcolor=0xEAFBFF:x=110:y=104,drawtext=fontfile=$FONT_BOLD:textfile=$title_file:fontsize=50:fontcolor=white:x=92:y=178,drawbox=x=92:y=304:w=1096:h=220:color=0x0B1220@0.98:t=fill,drawtext=fontfile=$FONT_BOLD:textfile=$line1_file:fontsize=32:fontcolor=${accent}:x=128:y=338,drawtext=fontfile=$FONT_REG:textfile=$line2_file:fontsize=28:fontcolor=0xF8FAFC:x=128:y=404,drawtext=fontfile=$FONT_REG:textfile=$line3_file:fontsize=28:fontcolor=0xD6E4F0:x=128:y=462,drawtext=fontfile=$FONT_REG:textfile=$proof_file:fontsize=22:fontcolor=0xA7F3D0:x=92:y=600,drawtext=fontfile=$FONT_REG:text='privatedao.org/services/qvac-sovereign-ai':fontsize=22:fontcolor=0xB8C7D9:x=92:y=632" \
    -frames:v 1 -update 1 "$scene" >/dev/null 2>&1
}

create_scene "01" "PrivateDAO + QVAC" "Local AI before sensitive DAO signatures" "The pain: public governance leaks pressure signals." "Votes, payroll, treasury context, and reviewer notes become influence vectors." "QVAC lets PrivateDAO explain the decision locally before a wallet signs." "Evidence: @qvac/sdk is imported and probed from the repo." "0x14F195"
create_scene "02" "The product flow" "Connect -> Intelligence -> Private Vote -> Reveal -> Verify" "Users see context before signing." "During voting, counts, percentages, leaders, wallets, and momentum stay hidden." "After reveal, PrivateDAO publishes outcome and proof." "Evidence: /try/ and /proof/?judge=1 stay connected to the same workflow." "0x00E5FF"
create_scene "03" "Why QVAC belongs here" "Decision intelligence must not become a new leak" "Private rooms and vote intent are sensitive." "A hosted AI endpoint would create another disclosure surface." "QVAC keeps the pre-sign brief on consumer hardware." "Evidence: qvac-hackathon-i-evidence.json documents prompt exclusions." "0x9945FF"
create_scene "04" "What the local model reviews" "Proposal context, treasury risk, counterparty risk, proof path" "QVAC reads public proposal metadata and approved risk notes." "It does not need hidden vote contents or voter identities." "The signer gets a concise decision brief before execution." "Evidence: scripts/run-qvac-hackathon-evidence.mjs is reproducible." "0x22C55E"
create_scene "05" "Hackathon-ready boundary" "PrivateDAO owns the workflow. QVAC powers local intelligence." "QVAC is not the voting privacy primitive." "PrivateDAO still handles private voting, reveal policy, proof, and execution." "That makes the integration useful without overclaiming." "Evidence: SDK probe plus optional full inference runner." "0xFACC15"
create_scene "06" "Submission proof" "Run it locally. Verify it publicly." "npm run qvac:hackathon:evidence" "npm run qvac:hackathon:inference" "Open the generated evidence JSON and the QVAC route." "Evidence: docs/qvac-hackathon-i-readiness-report-2026-06-01.md" "0x38BDF8"

ffmpeg -y \
  -loop 1 -t 9 -i "$TMP_DIR/scene-01.png" \
  -loop 1 -t 9 -i "$TMP_DIR/scene-02.png" \
  -loop 1 -t 9 -i "$TMP_DIR/scene-03.png" \
  -loop 1 -t 9 -i "$TMP_DIR/scene-04.png" \
  -loop 1 -t 9 -i "$TMP_DIR/scene-05.png" \
  -loop 1 -t 9 -i "$TMP_DIR/scene-06.png" \
  -filter_complex "[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[2:v]fps=30,format=yuv420p[v2];[3:v]fps=30,format=yuv420p[v3];[4:v]fps=30,format=yuv420p[v4];[5:v]fps=30,format=yuv420p[v5];[v0][v1]xfade=transition=fade:duration=0.55:offset=8.45[x1];[x1][v2]xfade=transition=fade:duration=0.55:offset=16.9[x2];[x2][v3]xfade=transition=fade:duration=0.55:offset=25.35[x3];[x3][v4]xfade=transition=fade:duration=0.55:offset=33.8[x4];[x4][v5]xfade=transition=fade:duration=0.55:offset=42.25,fade=t=in:st=0:d=0.4,fade=t=out:st=52:d=1.4[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUTPUT" >/dev/null 2>&1

cp "$TMP_DIR/scene-01.png" "$POSTER"
cp "$OUTPUT" "$PUBLIC_OUTPUT"
cp "$POSTER" "$PUBLIC_POSTER"
cp "$OUTPUT" "$DESKTOP_OUTPUT"
cp "$POSTER" "$DESKTOP_POSTER"
rm -rf "$TMP_DIR"

echo "Rendered QVAC hackathon video:"
echo "  $OUTPUT"
echo "Public copies:"
echo "  $PUBLIC_OUTPUT"
echo "  $PUBLIC_POSTER"
echo "Desktop copies:"
echo "  $DESKTOP_OUTPUT"
echo "  $DESKTOP_POSTER"
