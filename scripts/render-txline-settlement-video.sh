#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$ROOT_DIR/apps/web/public/videos"
ASSETS_DIR="$ROOT_DIR/docs/assets/txline-settlement-video"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUTPUT="$PUBLIC_DIR/txline-settlement-demo-3min.mp4"
POSTER="$PUBLIC_DIR/txline-settlement-demo-poster.png"
LOGO="$ROOT_DIR/apps/web/public/assets/txline/world-cup-hackathon-logo.png"

mkdir -p "$PUBLIC_DIR" "$ASSETS_DIR"

SCENE1="$ASSETS_DIR/scene-01.png"
SCENE2="$ASSETS_DIR/scene-02.png"
SCENE3="$ASSETS_DIR/scene-03.png"
SCENE4="$ASSETS_DIR/scene-04.png"
SCENE5="$ASSETS_DIR/scene-05.png"
SCENE6="$ASSETS_DIR/scene-06.png"

ffmpeg -y -f lavfi -i "color=c=#06111A:s=1280x720" -i "$LOGO" \
  -filter_complex "[1:v]scale=192:-1[logo];[0:v]drawbox=x=0:y=0:w=1280:h=720:color=0x06111A:t=fill,drawbox=x=74:y=66:w=1132:h=588:color=0x0B1722@0.92:t=fill,drawtext=fontfile=$FONT_BOLD:text='TxLINE Match Settlement':fontsize=54:fontcolor=white:x=96:y=170,drawtext=fontfile=$FONT_BOLD:text='World Cup markets settle themselves':fontsize=50:fontcolor=0xFFF1B0:x=96:y=252,drawtext=fontfile=$FONT_REG:text='Fan experience outside. Cryptographic engine underneath.':fontsize=31:fontcolor=0xDCE8F6:x=100:y=340,drawtext=fontfile=$FONT_BOLD:text='Brazil vs Morocco':fontsize=36:fontcolor=0xA9F5FF:x=100:y=476,drawtext=fontfile=$FONT_REG:text='Official World Cup fixture 17588386 from txdoc schedule':fontsize=27:fontcolor=white:x=100:y=530,drawtext=fontfile=$FONT_REG:text='Powered by TxLINE score validation and Solana receipts':fontsize=25:fontcolor=0xDCE8F6:x=100:y=588[base];[base][logo]overlay=940:96[v]" \
  -map "[v]" -frames:v 1 -update 1 "$SCENE1"

ffmpeg -y -f lavfi -i "color=c=#07111D:s=1280x720" \
  -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x07111D:t=fill,drawbox=x=72:y=70:w=1136:h=580:color=0x0B1722@0.92:t=fill,drawtext=fontfile=$FONT_BOLD:text='1  Market opens':fontsize=54:fontcolor=white:x=98:y=112,drawtext=fontfile=$FONT_REG:text='A buyer chooses a World Cup match market':fontsize=31:fontcolor=0xDCE8F6:x=102:y=194,drawbox=x=100:y=290:w=478:h=190:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Brazil':fontsize=42:fontcolor=0xA9F5FF:x=132:y=328,drawtext=fontfile=$FONT_REG:text='home win  1.82':fontsize=29:fontcolor=white:x=132:y=388,drawtext=fontfile=$FONT_BOLD:text='Morocco':fontsize=42:fontcolor=0xFFF1B0:x=132:y=446,drawbox=x=700:y=294:w=380:h=186:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Operator view':fontsize=32:fontcolor=0x00E5FF:x=730:y=326,drawtext=fontfile=$FONT_REG:text='fixture 17588386':fontsize=27:fontcolor=white:x=730:y=386,drawtext=fontfile=$FONT_REG:text='World Cup group stage':fontsize=27:fontcolor=white:x=730:y=430,drawtext=fontfile=$FONT_REG:text='market winner':fontsize=27:fontcolor=white:x=730:y=474" \
  -frames:v 1 -update 1 "$SCENE2"

ffmpeg -y -f lavfi -i "color=c=#06111A:s=1280x720" \
  -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x06111A:t=fill,drawbox=x=72:y=70:w=1136:h=580:color=0x0B1722@0.92:t=fill,drawtext=fontfile=$FONT_BOLD:text='2  Match ends':fontsize=54:fontcolor=white:x=98:y=112,drawtext=fontfile=$FONT_REG:text='TxLINE supplies the result packet used by settlement':fontsize=31:fontcolor=0xDCE8F6:x=102:y=194,drawbox=x=116:y=300:w=360:h=150:color=0x00E5FF@0.10:t=fill,drawtext=fontfile=$FONT_BOLD:text='Brazil 2':fontsize=46:fontcolor=white:x=146:y=330,drawtext=fontfile=$FONT_BOLD:text='Morocco 1':fontsize=46:fontcolor=white:x=146:y=392,drawbox=x=612:y=286:w=520:h=198:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Official input':fontsize=34:fontcolor=0xFFF1B0:x=642:y=318,drawtext=fontfile=$FONT_REG:text='/api/scores/snapshot/{fixtureId}':fontsize=27:fontcolor=white:x=642:y=382,drawtext=fontfile=$FONT_REG:text='/api/scores/stat-validation':fontsize=27:fontcolor=white:x=642:y=430,drawtext=fontfile=$FONT_REG:text='No guessed stat keys':fontsize=25:fontcolor=0xA9F5FF:x=642:y=478" \
  -frames:v 1 -update 1 "$SCENE3"

ffmpeg -y -f lavfi -i "color=c=#120C02:s=1280x720" \
  -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x120C02:t=fill,drawbox=x=72:y=70:w=1136:h=580:color=0x22110A@0.90:t=fill,drawtext=fontfile=$FONT_BOLD:text='3  TxLINE validates':fontsize=54:fontcolor=white:x=98:y=112,drawtext=fontfile=$FONT_REG:text='The engine verifies the sports data before money moves':fontsize=31:fontcolor=0xF6E7D1:x=102:y=194,drawbox=x=110:y=300:w=480:h=178:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Merkle proof':fontsize=34:fontcolor=0xFFE48A:x=140:y=330,drawtext=fontfile=$FONT_REG:text='score batch summary':fontsize=27:fontcolor=white:x=140:y=388,drawtext=fontfile=$FONT_REG:text='fixture proof plus main tree proof':fontsize=27:fontcolor=white:x=140:y=434,drawbox=x=696:y=300:w=394:h=178:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='CPI target':fontsize=34:fontcolor=0xA9F5FF:x=726:y=330,drawtext=fontfile=$FONT_REG:text='validate_stat':fontsize=29:fontcolor=white:x=726:y=392,drawtext=fontfile=$FONT_REG:text='TxLINE program ready path':fontsize=25:fontcolor=white:x=726:y=438" \
  -frames:v 1 -update 1 "$SCENE4"

ffmpeg -y -f lavfi -i "color=c=#07111D:s=1280x720" \
  -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x07111D:t=fill,drawbox=x=72:y=70:w=1136:h=580:color=0x0B1722@0.92:t=fill,drawtext=fontfile=$FONT_BOLD:text='4  Settlement executes':fontsize=54:fontcolor=white:x=98:y=112,drawtext=fontfile=$FONT_REG:text='PrivateDAO proves the payout policy without revealing the book':fontsize=31:fontcolor=0xDCE8F6:x=102:y=194,drawbox=x=112:y=292:w=420:h=226:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Public':fontsize=34:fontcolor=0xA9F5FF:x=142:y=326,drawtext=fontfile=$FONT_REG:text='fixture id':fontsize=27:fontcolor=white:x=142:y=382,drawtext=fontfile=$FONT_REG:text='final score':fontsize=27:fontcolor=white:x=142:y=428,drawtext=fontfile=$FONT_REG:text='proof hash':fontsize=27:fontcolor=white:x=142:y=474,drawbox=x=704:y=292:w=420:h=226:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Hidden':fontsize=34:fontcolor=0xFFF1B0:x=734:y=326,drawtext=fontfile=$FONT_REG:text='risk thresholds':fontsize=27:fontcolor=white:x=734:y=382,drawtext=fontfile=$FONT_REG:text='payout routing':fontsize=27:fontcolor=white:x=734:y=428,drawtext=fontfile=$FONT_REG:text='operator notes':fontsize=27:fontcolor=white:x=734:y=474" \
  -frames:v 1 -update 1 "$SCENE5"

ffmpeg -y -f lavfi -i "color=c=#06111A:s=1280x720" \
  -vf "drawbox=x=0:y=0:w=1280:h=720:color=0x06111A:t=fill,drawbox=x=72:y=70:w=1136:h=580:color=0x0B1722@0.92:t=fill,drawtext=fontfile=$FONT_BOLD:text='5  Receipt verifies':fontsize=54:fontcolor=white:x=98:y=112,drawtext=fontfile=$FONT_REG:text='The customer gets a result. The reviewer gets proof.':fontsize=31:fontcolor=0xDCE8F6:x=102:y=194,drawbox=x=100:y=300:w=500:h=210:color=0x101B28@0.96:t=fill,drawtext=fontfile=$FONT_BOLD:text='Solana Mainnet receipt':fontsize=34:fontcolor=0xFFF1B0:x=130:y=334,drawtext=fontfile=$FONT_REG:text='memo contains hashes only':fontsize=27:fontcolor=white:x=130:y=394,drawtext=fontfile=$FONT_REG:text='no private policy leakage':fontsize=27:fontcolor=white:x=130:y=440,drawbox=x=696:y=300:w=400:h=210:color=0x00E5FF@0.10:t=fill,drawtext=fontfile=$FONT_BOLD:text='Why it wins':fontsize=34:fontcolor=0xA9F5FF:x=726:y=334,drawtext=fontfile=$FONT_REG:text='clear fan UX':fontsize=27:fontcolor=white:x=726:y=394,drawtext=fontfile=$FONT_REG:text='official TxLINE data':fontsize=27:fontcolor=white:x=726:y=440,drawtext=fontfile=$FONT_REG:text='verifiable settlement':fontsize=27:fontcolor=white:x=726:y=486" \
  -frames:v 1 -update 1 "$SCENE6"

ffmpeg -y \
  -loop 1 -t 15 -i "$SCENE1" \
  -loop 1 -t 14 -i "$SCENE2" \
  -loop 1 -t 15 -i "$SCENE3" \
  -loop 1 -t 15 -i "$SCENE4" \
  -loop 1 -t 15 -i "$SCENE5" \
  -loop 1 -t 14 -i "$SCENE6" \
  -filter_complex "[0:v]fps=1,format=yuv420p[v0];[1:v]fps=1,format=yuv420p[v1];[2:v]fps=1,format=yuv420p[v2];[3:v]fps=1,format=yuv420p[v3];[4:v]fps=1,format=yuv420p[v4];[5:v]fps=1,format=yuv420p[v5];[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUTPUT"

cp "$SCENE1" "$POSTER"
echo "Rendered TxLINE settlement video:"
echo "  $OUTPUT"
echo "Poster:"
echo "  $POSTER"
