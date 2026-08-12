const defaults = [
  { id: 'address', name: 'アドレス', description: '構えたときの姿勢・重心・ボールとの距離を確認します。' },
  { id: 'top', name: 'トップ', description: 'バックスイング頂点での体の捻転とクラブ位置を確認します。' },
  { id: 'downswing', name: 'ダウンスイング', description: '切り返しからインパクトへ向かう軌道を確認します。' },
  { id: 'impact', name: 'インパクト', description: 'ボールを捉える瞬間の姿勢とフェース向きを確認します。' },
  { id: 'finish', name: 'フィニッシュ', description: '振り抜いた後のバランスと体重移動を確認します。' }
].map(point => ({ ...point, good: '', improve: '', timestamp: '' }));

/**
 * Analysis data gateway. Replace this local adapter with a pose-estimation API
 * adapter later without changing playback or review UI code.
 */
export function createAnalysisService(storage = window.localStorage) {
  const key = 'swing-note-checkpoints-v1';
  let points;
  try { points = JSON.parse(storage.getItem(key)) || structuredClone(defaults); }
  catch { points = structuredClone(defaults); }
  const persist = () => storage.setItem(key, JSON.stringify(points));
  return {
    getCheckpoints: () => points,
    getCheckpoint: id => points.find(point => point.id === id),
    update(id, patch) { points = points.map(point => point.id === id ? { ...point, ...patch } : point); persist(); }
  };
}
