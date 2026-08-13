import { poseMetrics } from './pose-geometry.js';

const avg = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const midpoint = (points, a, b) => points?.[a] && points?.[b] ? avg(points[a], points[b]) : null;
const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
const levelTilt = value => {
  if (value == null) return null;
  let a = Math.abs(value) % 180;
  if (a > 90) a = 180 - a;
  return a;
};

function sideLevel(points, leftIndex, rightIndex) {
  const left = points?.[leftIndex], right = points?.[rightIndex];
  if (!left || !right) return null;
  const angle = levelTilt(Math.atan2(right.y - left.y, right.x - left.x) * 180 / Math.PI);
  const epsilon = 0.004;
  if (Math.abs(left.y - right.y) < epsilon) return { angle, higher: null, lower: null };
  return left.y < right.y
    ? { angle, higher: '左', lower: '右' }
    : { angle, higher: '右', lower: '左' };
}

function directionalLevelText(kind, level, goodLimit) {
  if (!level) return null;
  const angle = Math.round(level.angle ?? 0);
  if (!level.higher) return {
    good: true,
    goodText: `${kind}はほぼ水平です`,
    improveText: `${kind}はほぼ水平です`
  };
  const good = level.angle <= goodLimit;
  return {
    good,
    goodText: `${kind}は${level.higher}側が約${angle}°高い状態で、大きな左右差はありません`,
    improveText: `${kind}は${level.higher}側が約${angle}°高く、${level.lower}側が低くなっています。${level.higher}側を少し下げる、または${level.lower}側を少し上げる方向で左右差を確認しましょう`
  };
}

function enriched(sample) {
  const p = sample.landmarks;
  const wrists = midpoint(p, 15, 16);
  const shoulders = midpoint(p, 11, 12);
  const hips = midpoint(p, 23, 24);
  const ankles = midpoint(p, 27, 28);
  const nose = p?.[0] || null;
  const m = poseMetrics(p);
  return {
    ...sample,
    wrists, shoulders, hips, ankles, nose,
    metrics: {
      ...m,
      shoulderLevel: levelTilt(m.shoulder),
      hipLevel: levelTilt(m.hip),
      shoulderSides: sideLevel(p, 11, 12),
      hipSides: sideLevel(p, 23, 24),
      headOffset: nose && hips ? nose.x - hips.x : null,
      stanceWidth: p?.[27] && p?.[28] ? distance(p[27], p[28]) : null,
      shoulderWidth: p?.[11] && p?.[12] ? distance(p[11], p[12]) : null
    }
  };
}

function wristSpeed(a, b) {
  if (!a?.wrists || !b?.wrists) return 0;
  const dt = Math.max(0.001, b.time - a.time);
  return distance(a.wrists, b.wrists) / dt;
}

function nearestIndex(items, target) {
  let best = 0, bestDistance = Infinity;
  items.forEach((item, index) => {
    const d = Math.abs(item.time - target);
    if (d < bestDistance) { bestDistance = d; best = index; }
  });
  return best;
}

export function detectSwingPhases(rawSamples) {
  const samples = rawSamples.filter(s => s.landmarks?.length).map(enriched);
  if (samples.length < 10) return null;

  const speeds = samples.map((sample, i) => i ? wristSpeed(samples[i - 1], sample) : 0);
  let impactSeed = 1;
  for (let i = 2; i < speeds.length - 2; i++) if (speeds[i] > speeds[impactSeed]) impactSeed = i;

  const duration = samples.at(-1).time - samples[0].time;
  const windowSeconds = Math.max(1.0, Math.min(4.5, duration * 0.28));
  const impactTime = samples[impactSeed].time;
  const startTime = Math.max(samples[0].time, impactTime - windowSeconds);
  const endTime = Math.min(samples.at(-1).time, impactTime + windowSeconds);
  const start = nearestIndex(samples, startTime);
  const end = nearestIndex(samples, endTime);
  const segment = samples.slice(start, end + 1);
  if (segment.length < 8) return null;

  const localImpact = impactSeed - start;
  const beforeImpact = segment.slice(0, Math.max(2, localImpact));
  const afterImpact = segment.slice(Math.min(segment.length - 1, localImpact + 1));

  let topIndex = 0;
  beforeImpact.forEach((s, i) => { if (s.wrists && (!beforeImpact[topIndex].wrists || s.wrists.y < beforeImpact[topIndex].wrists.y)) topIndex = i; });

  let finishLocal = Math.max(localImpact + 1, segment.length - 1);
  afterImpact.forEach((s, i) => {
    const idx = i + localImpact + 1;
    if (s.wrists && segment[finishLocal]?.wrists && s.wrists.y < segment[finishLocal].wrists.y) finishLocal = idx;
  });

  const addressSearchEnd = Math.max(1, topIndex - 1);
  let addressIndex = 0;
  for (let i = 1; i <= addressSearchEnd; i++) {
    if (segment[i].wrists && segment[addressIndex].wrists && segment[i].wrists.y > segment[addressIndex].wrists.y) addressIndex = i;
  }

  const impactIndex = Math.max(topIndex + 1, Math.min(segment.length - 2, localImpact));
  const downswingIndex = Math.round((topIndex + impactIndex) / 2);
  const phases = {
    address: segment[addressIndex],
    top: segment[topIndex],
    downswing: segment[downswingIndex],
    impact: segment[impactIndex],
    finish: segment[finishLocal]
  };
  return { phases, activeWindow: [segment[0].time, segment.at(-1).time] };
}

function addFinding(findings, good, goodText, improveText) {
  findings.push({ good, text: good ? goodText : improveText });
}

function addDirectionalFinding(findings, kind, level, limit) {
  const info = directionalLevelText(kind, level, limit);
  if (info) addFinding(findings, info.good, info.goodText, info.improveText);
}

export function evaluatePhase(name, sample) {
  if (!sample) return { score: null, findings: [], summary: '判定できませんでした' };
  const enrichedSample = sample.metrics?.shoulderSides ? sample : enriched(sample);
  const m = enrichedSample.metrics;
  const findings = [];

  if (name === 'address') {
    if (m.shoulderSides) addDirectionalFinding(findings, '肩ライン', m.shoulderSides, 12);
    if (m.hipSides) addDirectionalFinding(findings, '腰ライン', m.hipSides, 10);
    if (m.leftKnee != null && m.rightKnee != null) {
      const diff = Math.abs(m.leftKnee - m.rightKnee);
      addFinding(findings, diff <= 15, `左右の膝角度差は約${Math.round(diff)}°でバランスが取れています`, `左右の膝角度差が約${Math.round(diff)}°あります。構えの左右バランスを確認しましょう`);
    }
  } else if (name === 'top') {
    const extension = Math.max(m.leftElbow ?? 0, m.rightElbow ?? 0);
    if (extension) addFinding(findings, extension >= 150, `片側の腕が約${Math.round(extension)}°まで伸びています`, `腕の伸びは約${Math.round(extension)}°です。無理に伸ばさず、再現性を確認しましょう`);
    if (m.shoulderSides) addDirectionalFinding(findings, '肩ライン', m.shoulderSides, 30);
  } else if (name === 'downswing') {
    if (m.leftElbow != null && m.rightElbow != null) {
      const bent = Math.min(m.leftElbow, m.rightElbow);
      addFinding(findings, bent >= 55 && bent <= 145, `切り返し中の肘角度は約${Math.round(bent)}°です`, `切り返し中の肘角度は約${Math.round(bent)}°です。動画で体との距離も合わせて確認しましょう`);
    }
    if (m.shoulderSides) addDirectionalFinding(findings, '肩ライン', m.shoulderSides, 35);
  } else if (name === 'impact') {
    if (m.leftKnee != null && m.rightKnee != null) {
      const diff = Math.abs(m.leftKnee - m.rightKnee);
      addFinding(findings, diff >= 5 && diff <= 55, `インパクト時に左右の膝へ約${Math.round(diff)}°の差が出ています`, `左右の膝角度差は約${Math.round(diff)}°です。正面映像なら体重移動と合わせて確認しましょう`);
    }
    if (m.headOffset != null) addFinding(findings, Math.abs(m.headOffset) <= 0.18, '頭と腰の中心位置が大きく離れていません', '頭と腰の中心に横方向の差があります。アドレス時との比較で確認しましょう');
    if (m.shoulderSides) addDirectionalFinding(findings, '肩ライン', m.shoulderSides, 35);
    if (m.hipSides) addDirectionalFinding(findings, '腰ライン', m.hipSides, 30);
  } else if (name === 'finish') {
    const extension = Math.max(m.leftElbow ?? 0, m.rightElbow ?? 0);
    if (extension) addFinding(findings, extension >= 135, `フィニッシュで腕が約${Math.round(extension)}°まで伸びています`, `フィニッシュの腕角度は約${Math.round(extension)}°です。バランス良く止まれるかも確認しましょう`);
    if (m.shoulderSides) addDirectionalFinding(findings, '肩ライン', m.shoulderSides, 35);
  }

  const valid = findings.length;
  const positives = findings.filter(f => f.good).length;
  const score = valid ? Math.round(60 + (positives / valid) * 40) : null;
  return { score, findings, summary: positives === valid && valid ? '観察できる範囲では安定しています' : '確認したいポイントがあります' };
}

export function overallAdvice(evaluations) {
  const entries = Object.entries(evaluations).filter(([, e]) => e?.score != null);
  if (!entries.length) return '十分な姿勢データを取得できませんでした。全身が映る明るい動画で再度お試しください。';
  entries.sort((a, b) => a[1].score - b[1].score);
  const [phase, evaluation] = entries[0];
  const names = { address:'アドレス', top:'トップ', downswing:'ダウンスイング', impact:'インパクト', finish:'フィニッシュ' };
  const point = evaluation.findings.find(f => !f.good)?.text;
  return point ? `${names[phase]}を優先して確認しましょう。${point}` : '大きな崩れは検出されませんでした。各チェックポイントの再現性を比べてみましょう。';
}
