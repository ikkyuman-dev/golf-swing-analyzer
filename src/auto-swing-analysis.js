import { detectSwingPhases, evaluatePhase, overallAdvice } from './swing-evaluator.js';

const PHASES = ['address','top','downswing','impact','finish'];
const PHASE_LABELS = {address:'アドレス',top:'トップ',downswing:'ダウンスイング',impact:'インパクト',finish:'フィニッシュ'};

function waitFor(video, event) {
  return new Promise(resolve => video.addEventListener(event, resolve, { once:true }));
}
async function seek(video, time) {
  if (Math.abs(video.currentTime - time) < .005) return;
  video.currentTime = time;
  await waitFor(video, 'seeked');
}

export async function analyzeSwingVideo(video, poseService, onProgress = () => {}) {
  if (!poseService || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('動画または姿勢モデルの準備ができていません');
  const wasPaused = video.paused;
  const originalTime = video.currentTime;
  video.pause();

  const duration = video.duration;
  const maxSamples = 120;
  const interval = Math.max(0.08, duration / maxSamples);
  const samples = [];
  let index = 0;
  for (let time = 0; time <= duration; time += interval) {
    await seek(video, Math.min(time, Math.max(0, duration - .001)));
    const result = poseService.detect(video, performance.now() + index++);
    const landmarks = result.landmarks?.[0];
    if (landmarks) samples.push({ time: video.currentTime, landmarks });
    onProgress(Math.min(95, Math.round((time / duration) * 95)));
  }

  const detected = detectSwingPhases(samples);
  if (!detected) throw new Error('スイング区間を十分に検出できませんでした');
  const evaluations = Object.fromEntries(PHASES.map(name => [name, evaluatePhase(name, detected.phases[name])]));
  const result = { phases: detected.phases, evaluations, advice: overallAdvice(evaluations), activeWindow: detected.activeWindow };

  await seek(video, originalTime);
  if (!wasPaused) video.play().catch(() => {});
  onProgress(100);
  return result;
}

export function renderAutoAnalysis(container, result, onJump) {
  const cards = PHASES.map(name => {
    const sample = result.phases[name];
    const evaluation = result.evaluations[name];
    const good = evaluation.findings.filter(f => f.good).map(f => `<li>${f.text}</li>`).join('') || '<li>このフレームでは明確な良い点を数値化できませんでした</li>';
    const improve = evaluation.findings.filter(f => !f.good).map(f => `<li>${f.text}</li>`).join('') || '<li>大きな注意点は検出されませんでした</li>';
    return `<article class="auto-phase-card"><header><div><span>${PHASE_LABELS[name]}</span><strong>${evaluation.score ?? '—'}<small>${evaluation.score == null ? '' : '/100'}</small></strong></div><button data-jump="${sample?.time ?? 0}">動画で確認</button></header><div class="auto-findings"><div><b>● 良い点</b><ul>${good}</ul></div><div><b>▲ 確認ポイント</b><ul>${improve}</ul></div></div></article>`;
  }).join('');
  container.innerHTML = `<div class="auto-summary"><span>AI</span><div><small>今回の優先ポイント</small><strong>${result.advice}</strong><p>姿勢推定による参考評価です。撮影方向・カメラ角度・服装などで数値は変化します。</p></div></div><div class="auto-phase-grid">${cards}</div>`;
  container.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => onJump(Number(button.dataset.jump))));
}
