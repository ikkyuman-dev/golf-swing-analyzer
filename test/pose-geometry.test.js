import test from 'node:test';
import assert from 'node:assert/strict';
import { jointAngle, lineTilt, poseMetrics } from '../src/pose-geometry.js';

test('calculates a joint interior angle', () => {
  assert.equal(Math.round(jointAngle({x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1})), 90);
  assert.equal(Math.round(jointAngle({x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0})), 180);
});

test('calculates signed line tilt', () => {
  assert.equal(Math.round(lineTilt({x: 0, y: 0}, {x: 1, y: 1})), 45);
  assert.equal(Math.round(lineTilt({x: 0, y: 1}, {x: 1, y: 0})), -45);
});

test('returns all six requested pose metrics', () => {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0 }));
  points[11]={x:0,y:0}; points[12]={x:1,y:0}; points[13]={x:0,y:1}; points[15]={x:1,y:1};
  points[14]={x:1,y:1}; points[16]={x:0,y:1}; points[23]={x:0,y:2}; points[24]={x:1,y:2};
  points[25]={x:0,y:3}; points[27]={x:1,y:3}; points[26]={x:1,y:3}; points[28]={x:0,y:3};
  assert.deepEqual(Object.keys(poseMetrics(points)), ['shoulder','hip','leftElbow','rightElbow','leftKnee','rightKnee']);
});
