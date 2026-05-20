#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSETS_DIR="$ROOT_DIR/docs/assets"
PUBLIC_ASSETS_DIR="$ROOT_DIR/apps/web/public/assets"
DESKTOP_DIR="/home/x-pact/Desktop/PrivateDAO-3-Minute-Product-Video"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUTPUT="$ASSETS_DIR/private-dao-3-minute-product-video.mp4"
POSTER="$ASSETS_DIR/private-dao-3-minute-product-video-poster.png"
PUBLIC_OUTPUT="$PUBLIC_ASSETS_DIR/private-dao-3-minute-product-video.mp4"
PUBLIC_POSTER="$PUBLIC_ASSETS_DIR/private-dao-3-minute-product-video-poster.png"
DESKTOP_OUTPUT="$DESKTOP_DIR/PrivateDAO - 3 Minute Product Walkthrough.mp4"
DESKTOP_POSTER="$DESKTOP_DIR/PrivateDAO - 3 Minute Product Walkthrough - Poster.png"

mkdir -p "$ASSETS_DIR" "$PUBLIC_ASSETS_DIR" "$DESKTOP_DIR"

create_scene() {
  local index="$1"
  local title="$2"
  local subtitle="$3"
  local line1="$4"
  local line2="$5"
  local line3="$6"
  local accent="$7"
  local scene="$ASSETS_DIR/private-dao-3min-scene-${index}.png"

  ffmpeg -y -f lavfi -i "color=c=#050816:s=1280x720" \
    -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x050816:t=fill,drawbox=x=48:y=48:w=1184:h=624:color=0x0B1220@0.94:t=fill,drawbox=x=48:y=48:w=1184:h=8:color=${accent}@0.95:t=fill,drawbox=x=82:y=104:w=226:h=38:color=${accent}@0.20:t=fill,drawtext=fontfile=$FONT_BOLD:text='PrivateDAO':fontsize=26:fontcolor=white:x=96:y=108,drawtext=fontfile=$FONT_BOLD:text='${title}':fontsize=54:fontcolor=white:x=92:y=178,drawtext=fontfile=$FONT_REG:text='${subtitle}':fontsize=28:fontcolor=0xCFE8FF:x=96:y=252,drawbox=x=96:y=344:w=1090:h=210:color=0x111827@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='${line1}':fontsize=34:fontcolor=${accent}:x=128:y=378,drawtext=fontfile=$FONT_REG:text='${line2}':fontsize=28:fontcolor=white:x=128:y=440,drawtext=fontfile=$FONT_REG:text='${line3}':fontsize=28:fontcolor=white:x=128:y=496,drawtext=fontfile=$FONT_REG:text='No code. No terminal. Wallet-first actions from web and mobile.':fontsize=24:fontcolor=0xB8C7D9:x=96:y=618" \
    -frames:v 1 -update 1 "$scene"
}

create_scene "01" "The problem" "DAOs need privacy, execution, and proof in one place." "Public chains expose strategy." "Payroll, vendor payments, and treasury moves become visible too early." "PrivateDAO makes those operations usable without hiding verification." "0x14F195"
create_scene "02" "The operating system" "Connect, review, sign, execute, verify." "One product shell." "Governance, payroll, treasury, gaming, compliance, and proof are connected." "The user stays in the interface from first click to final receipt." "0x00E5FF"
create_scene "03" "Governance Workbench" "Create a DAO and run the lifecycle from the wallet." "Create DAO. Create proposal." "Commit vote, reveal, finalize, then execute on Solana Testnet." "Every step creates a signature that can be opened in Solscan." "0xFFE48A"
create_scene "04" "Intelligence layer" "QVAC, Covalent GoldRush, SNS, Zerion, and RPC quality before signing." "Local AI explains the operation." "Covalent GoldRush adds wallet and transaction context." "The signer sees risk, counterparty posture, and privacy mode first." "0x38BDF8"
create_scene "05" "Treasury intelligence" "Policy, solvency posture, Jupiter route preview, and agent limits." "Treasury actions are reviewed before release." "Jupiter shows route and output; Zerion-style policies bound automation." "Operators see what changes and why before a wallet prompt appears." "0xF59E0B"
create_scene "06" "Confidential payroll" "CSV payroll with private payout rails and audit receipts." "Upload payroll, choose USDC, PUSD, AUDD, or SOL." "Umbra and Cloak lanes prepare confidential settlement receipts." "Supabase records browser-side proof rows after confirmed operations." "0xA78BFA"
create_scene "07" "Gaming DAO" "Guilds, tournaments, inventory proposals, and private rewards." "Create a guild and tournament." "Approve reward distribution through governance." "Winners can be paid through private payout rails with proof retained." "0xFB7185"
create_scene "08" "Proof Matrix" "ZK badges, viewing keys, signatures, and live receipt timeline." "Proof is not a separate dashboard." "It follows each operation from proposal to settlement evidence." "Judges can inspect Solscan links and Supabase receipt continuity." "0x22C55E"
create_scene "09" "Cryptographic stack" "ZK, REFHE, MagicBlock, Umbra, Cloak, and Anchor 1.0.1." "ZK proves correctness without exposing sensitive inputs." "REFHE frames encrypted treasury logic; MagicBlock accelerates corridors." "Anchor 1.0.1 powers the current Solana Testnet program." "0x06B6D4"
create_scene "10" "Compliance hub" "Scoped disclosure instead of exposing the whole wallet history." "Choose a period." "Generate an audit pack with bounded viewing-key logic." "The product explains what the auditor sees and what stays private." "0xFACC15"
create_scene "11" "Mobile and Android" "PrivateDAO is designed for web and real mobile review." "Operators can start from desktop." "Mobile flows make governance and proof accessible without a terminal." "The same Testnet story stays connected across web, Android, and docs." "0x60A5FA"
create_scene "12" "Why PrivateDAO wins" "A serious product, a serious protocol, and honest proof boundaries." "Judges get direct routes." "Users get clear actions." "Builders get SDK, API, and infrastructure paths they can verify." "0x14F195"

ffmpeg -y \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-01.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-02.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-03.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-04.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-05.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-06.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-07.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-08.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-09.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-10.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-11.png" \
  -loop 1 -t 15 -i "$ASSETS_DIR/private-dao-3min-scene-12.png" \
  -filter_complex "[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[2:v]fps=30,format=yuv420p[v2];[3:v]fps=30,format=yuv420p[v3];[4:v]fps=30,format=yuv420p[v4];[5:v]fps=30,format=yuv420p[v5];[6:v]fps=30,format=yuv420p[v6];[7:v]fps=30,format=yuv420p[v7];[8:v]fps=30,format=yuv420p[v8];[9:v]fps=30,format=yuv420p[v9];[10:v]fps=30,format=yuv420p[v10];[11:v]fps=30,format=yuv420p[v11];[v0][v1]xfade=transition=fade:duration=0.8:offset=14.2[x1];[x1][v2]xfade=transition=fade:duration=0.8:offset=28.4[x2];[x2][v3]xfade=transition=fade:duration=0.8:offset=42.6[x3];[x3][v4]xfade=transition=fade:duration=0.8:offset=56.8[x4];[x4][v5]xfade=transition=fade:duration=0.8:offset=71.0[x5];[x5][v6]xfade=transition=fade:duration=0.8:offset=85.2[x6];[x6][v7]xfade=transition=fade:duration=0.8:offset=99.4[x7];[x7][v8]xfade=transition=fade:duration=0.8:offset=113.6[x8];[x8][v9]xfade=transition=fade:duration=0.8:offset=127.8[x9];[x9][v10]xfade=transition=fade:duration=0.8:offset=142.0[x10];[x10][v11]xfade=transition=fade:duration=0.8:offset=156.2,fade=t=in:st=0:d=0.5,fade=t=out:st=170:d=2[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUTPUT"

cp "$ASSETS_DIR/private-dao-3min-scene-12.png" "$POSTER"
cp "$OUTPUT" "$PUBLIC_OUTPUT"
cp "$POSTER" "$PUBLIC_POSTER"
cp "$OUTPUT" "$DESKTOP_OUTPUT"
cp "$POSTER" "$DESKTOP_POSTER"
rm -f "$ASSETS_DIR"/private-dao-3min-scene-*.png

echo "Rendered 3-minute product video:"
echo "  $OUTPUT"
echo "Public copies:"
echo "  $PUBLIC_OUTPUT"
echo "  $PUBLIC_POSTER"
echo "Desktop copies:"
echo "  $DESKTOP_OUTPUT"
echo "  $DESKTOP_POSTER"
