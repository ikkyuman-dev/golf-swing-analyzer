# Swing Note — Golf Swing Analyzer

スマートフォンやPCからスイング動画をアップロードし、スロー再生・一時停止・コマ送りを使って5つのポジションを振り返るレスポンシブWebアプリです。姿勢推定もブラウザ内で実行され、動画ファイルを外部サーバーへアップロードしません。

## 自動姿勢分析

- **使用ライブラリ:** [MediaPipe Tasks Vision Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
- Pose Landmarker Liteモデルで、肩・肘・手首・腰・膝・足首を含む33個のランドマークを端末上で検出します。
- 検出した関節点と骨格線を動画の上へリアルタイムに描画します。「骨格を表示」スイッチで表示を切り替えられます。
- 一時停止すると、そのフレームの肩・腰の傾きと、左右の肘・膝の角度を表示します。スロー再生と前後1フレーム送りも併用できます。
- ライブラリのWASMと学習済みモデルは初回利用時にCDNから取得しますが、選択した動画や推定結果は外部へ送信しません。

> 姿勢推定値は撮影角度や遮蔽の影響を受ける参考値です。医療・診断用途には使用しないでください。

## 開発

```bash
npm install
npm run dev
```

## 構成

- `app.js`: 動画アップロード、プレイヤー、姿勢分析、レビューUI
- `src/analysis-service.js`: 分析データのゲートウェイ（将来、姿勢推定APIのアダプターに置換可能）
- `src/pose-service.js`: MediaPipeの初期化、端末内推論、骨格オーバーレイ描画
- `src/pose-geometry.js`: 関節角度と肩・腰の傾きの計算
- `styles.css`: モバイルファーストのレスポンシブスタイル
