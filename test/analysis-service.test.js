import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalysisService } from '../src/analysis-service.js';

function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; }

test('provides all five swing checkpoints', () => {
  const service = createAnalysisService(storage());
  assert.deepEqual(service.getCheckpoints().map(p => p.id), ['address', 'top', 'downswing', 'impact', 'finish']);
});

test('persists manual review updates', () => {
  const store = storage();
  createAnalysisService(store).update('impact', { good: '頭の位置が安定' });
  assert.equal(createAnalysisService(store).getCheckpoint('impact').good, '頭の位置が安定');
});
