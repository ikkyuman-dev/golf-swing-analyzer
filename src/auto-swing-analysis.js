import { detectSwingPhases, evaluatePhase, overallAdvice } from './swing-evaluator.js';

const PHASES = ['address','top','downswing','impact','finish'];
const PHASE_LABELS = {address:'アドレス',top:'トップ',downswing:'ダウンスイング',impact:'インパクト',finish:'フィニッシュ'};

function waitFor(video, event) { return new Promise(resolve => video.addEventListener(event, resolve, { once:true })); }
async function seek(video, time) { if (Math.abs(video.currentTime - time) < .005) return; video.currentTime = time; await waitFor(video, 'seeked'); }

function coachDetail(phase, finding) {
  if (finding.good) return null;
  const text = finding.text || '';
  if (text.includes('肩ライン')) {
    const context = phase === 'address'
      ? 'アドレスの肩ラインは、スイング軸とクラブの入り方に影響します。左右差が大きいと、始動から体が傾いたまま動きやすくなります。'
      : phase === 'top'
        ? 'トップで肩の傾きが大きすぎると、切り返しで上体を戻す動きが増え、クラブ軌道や打点が不安定になることがあります。'
        : phase === 'downswing'
          ? 'ダウンスイング中の肩ラインはクラブの入射方向と関係します。急な傾きの変化は、アウトサイドインやインサイドアウトが強くなる一因になり得ます。'
          : phase === 'impact'
            ? 'インパクトの肩ラインは入射角やフェース管理と関係します。極端な左右差は、打点や左右の球筋が安定しにくくなる要因の一つです。'
            : 'フィニッシュの肩ラインは、スイング中の回転とバランスの結果として確認できます。極端な傾きが残る場合は、最後まで立っていられるかも確認しましょう。';
    return { effect: context, drill: '練習：鏡や正面動画で肩を結ぶ線を確認し、まず小さなハーフスイングで同じ姿勢を再現してください。数値だけを無理に水平へ合わせず、撮影角度と球筋も一緒に確認しましょう。' };
  }
  if (text.includes('腰ライン')) return { effect:'腰ラインの左右差は骨盤の傾きと体重配分の目安になります。極端な傾きは回転のしやすさやインパクトの再現性に影響する可能性があります。', drill:'練習：クラブを腰の前に水平に当て、鏡を見ながら骨盤の傾きを確認します。その姿勢から腰から腰までの小さいスイングを10回行いましょう。' };
  if (text.includes('膝角度')) return { effect:'左右の膝の使い方は下半身の安定と体重移動に関係します。左右差が極端だと、スウェーや伸び上がりにつながる場合があります。', drill:'練習：両足の圧を感じながらハーフスイングを行い、膝の高さが急に変わらないことを動画で確認してください。' };
  if (text.includes('肘角度') || text.includes('腕の伸び')) return { effect:'肘と腕の形はクラブと体の距離、スイング半径、切り返しの再現性に関係します。形を作りすぎるより、体の回転と同調しているかが重要です。', drill:'練習：両脇に軽くタオルを挟んだハーフスイングを5〜10回行い、腕だけでクラブを動かしていないか確認しましょう。' };
  if (text.includes('頭と腰')) return { effect:'頭と腰の中心位置の大きなズレは、スウェーや上体の突っ込みの目安になることがあります。ただし正面・後方など撮影方向で見え方が変わります。', drill:'練習：頭の位置に画面上の目印を置き、腰から腰までのスイングで左右移動量を確認してください。頭を固定するのではなく、急激な移動を減らす意識で行いましょう。' };
  return { effect:'この数値は姿勢推定から得た参考値です。単独でミスショットの原因とは断定できないため、球筋や撮影方向と合わせて確認してください。', drill:'練習：同じ撮影位置で3〜5球撮影し、毎回同じ傾向が出るか比較してください。' };
}

export async function analyzeSwingVideo(video, poseService, onProgress = () => {}) {
  if (!poseService || !Number.isFinite(video.duration) || video.duration <= 0) throw new Error('動画または姿勢モデルの準備ができていません');
  const wasPaused = video.paused, originalTime = video.currentTime; video.pause();
  const duration = video.duration, maxSamples = 120, interval = Math.max(0.08, duration / maxSamples), samples = []; let index = 0;
  for (let time = 0; time <= duration; time += interval) {
    await seek(video, Math.min(time, Math.max(0, duration - .001)));
    const result = poseService.detect(video, performance.now() + index++), landmarks = result.landmarks?.[0];
    if (landmarks) samples.push({ time: video.currentTime, landmarks });
    onProgress(Math.min(95, Math.round((time / duration) * 95)));
  }
  const detected = detectSwingPhases(samples); if (!detected) throw new Error('スイング区間を十分に検出できませんでした');
  const evaluations = Object.fromEntries(PHASES.map(name => [name, evaluatePhase(name, detected.phases[name])]));
  const result = { phases: detected.phases, evaluations, advice: overallAdvice(evaluations), activeWindow: detected.activeWindow };
  await seek(video, originalTime); if (!wasPaused) video.play().catch(() => {}); onProgress(100); return result;
}

export function renderAutoAnalysis(container, result, onJump) {
  const cards = PHASES.map(name => {
    const sample = result.phases[name], evaluation = result.evaluations[name];
    const good = evaluation.findings.filter(f => f.good).map(f => `<li>${f.text}</li>`).join('') || '<li>このフレームでは明確な良い点を数値化できませんでした</li>';
    const badFindings = evaluation.findings.filter(f => !f.good);
    const improve = badFindings.map(f => `<li><strong>${f.text}</strong>${(() => { const c=coachDetail(name,f); return c ? `<p><b>なぜ？</b> ${c.effect}</p><p><b>おすすめ練習</b> ${c.drill}</p>` : ''; })()}</li>`).join('') || '<li>大きな注意点は検出されませんでした</li>';
    return `<article class="auto-phase-card"><header><div><span>${PHASE_LABELS[name]}</span><strong>${evaluation.score ?? '—'}<small>${evaluation.score == null ? '' : '/100'}</small></strong></div><button data-jump="${sample?.time ?? 0}">動画で確認</button></header><div class="auto-findings"><div><b>● 良い点</b><ul>${good}</ul></div><div><b>▲ 確認ポイント</b><ul>${improve}</ul></div></div></article>`;
  }).join('');
  container.innerHTML = `<div class="auto-summary"><span>AI</span><div><small>今回の優先ポイント</small><strong>${result.advice}</strong><p>姿勢推定による参考評価です。球筋の原因を断定するものではありません。撮影方向・カメラ角度・服装などでも数値は変化します。</p></div></div><div class="auto-phase-grid">${cards}</div>`;
  container.querySelectorAll('[data-jump]').forEach(button => button.addEventListener('click', () => onJump(Number(button.dataset.jump))));
}
