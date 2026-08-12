import { createAnalysisService } from './src/analysis-service.js';

const $ = (selector) => document.querySelector(selector);
const video = $('#swingVideo');
const input = $('#videoInput');
const dropzone = $('#dropzone');
const analysis = createAnalysisService();
let objectUrl;

$('#today').textContent = new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

function formatTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  const frames = Math.floor((seconds % 1) * 30).toString().padStart(2, '0');
  return `${minutes}:${secs}.${frames}`;
}

function loadVideo(file) {
  if (!file?.type.startsWith('video/')) return showToast('動画ファイルを選択してください');
  if (file.size > 500 * 1024 * 1024) return showToast('500MB以下の動画を選択してください');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  dropzone.classList.add('has-video');
  $('#uploadPrompt').hidden = true;
  $('#videoControls').hidden = false;
  video.playbackRate = 0.5;
  showToast(`${file.name} を読み込みました`);
}

$('#selectVideo').addEventListener('click', () => input.click());
input.addEventListener('change', () => loadVideo(input.files[0]));
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, e => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, e => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', e => loadVideo(e.dataTransfer.files[0]));

$('#playPause').addEventListener('click', () => video.paused ? video.play() : video.pause());
video.addEventListener('play', () => $('#playPause').textContent = 'Ⅱ');
video.addEventListener('pause', () => $('#playPause').textContent = '▶');
video.addEventListener('loadedmetadata', () => $('#duration').textContent = formatTime(video.duration));
video.addEventListener('timeupdate', () => {
  $('#currentTime').textContent = formatTime(video.currentTime);
  $('#timeline').value = video.duration ? (video.currentTime / video.duration) * 1000 : 0;
});
$('#timeline').addEventListener('input', e => video.currentTime = (e.target.value / 1000) * video.duration);
$('#mute').addEventListener('click', () => { video.muted = !video.muted; $('#mute').textContent = video.muted ? '×' : '⌁'; });
$('#speedOptions').addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button) return;
  video.playbackRate = Number(button.dataset.speed);
  document.querySelectorAll('#speedOptions button').forEach(b => b.classList.toggle('active', b === button));
});
function seekFrame(direction) { video.pause(); video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + direction / 30)); }
$('#prevFrame').addEventListener('click', () => seekFrame(-1));
$('#nextFrame').addEventListener('click', () => seekFrame(1));

const tabs = $('#checkpointTabs');
analysis.getCheckpoints().forEach((point, index) => {
  const button = document.createElement('button');
  button.className = `checkpoint-tab${index === 0 ? ' active' : ''}`;
  button.role = 'tab'; button.dataset.id = point.id;
  button.innerHTML = `<span>0${index + 1}</span>${point.name}`;
  button.addEventListener('click', () => renderPoint(point.id));
  tabs.append(button);
});

function renderPoint(id) {
  const point = analysis.getCheckpoint(id);
  document.querySelectorAll('.checkpoint-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.id === id));
  $('#checkpointPanel').innerHTML = `<div class="panel-title"><div><h3>${point.name}</h3><p>${point.description}</p></div><button class="timestamp-button" id="markTime">＋ 現在位置を記録 <span>${point.timestamp || '--:--.--'}</span></button></div><div class="review-grid"><div class="review-box good"><label><span>●</span> 良い点</label><textarea id="goodNote" placeholder="安定している動きや、できている点を記録しましょう">${point.good}</textarea></div><div class="review-box improve"><label><span>▲</span> 改善ポイント</label><textarea id="improveNote" placeholder="次回意識したい動きや、改善点を記録しましょう">${point.improve}</textarea></div></div><div class="save-row"><button id="saveReview" class="save-button">記録を保存</button></div>`;
  $('#markTime').addEventListener('click', () => { analysis.update(id, { timestamp: formatTime(video.currentTime) }); renderPoint(id); });
  $('#saveReview').addEventListener('click', () => { analysis.update(id, { good: $('#goodNote').value, improve: $('#improveNote').value }); showToast('チェックポイントを保存しました'); });
}
renderPoint('address');

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500); }
window.addEventListener('beforeunload', () => objectUrl && URL.revokeObjectURL(objectUrl));
