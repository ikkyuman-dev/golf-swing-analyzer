# Swing Note — Golf Swing Analyzer

スマートフォンやPCからスイング動画をアップロードし、スロー再生・一時停止・コマ送りを使って5つのポジションを振り返るレスポンシブWebアプリです。

## 開発

```bash
npm install
npm run dev
```

## 構成

- `app.js`: 動画アップロード、プレイヤー、レビューUI
- `src/analysis-service.js`: 分析データのゲートウェイ（将来、姿勢推定APIのアダプターに置換可能）
- `styles.css`: モバイルファーストのレスポンシブスタイル
