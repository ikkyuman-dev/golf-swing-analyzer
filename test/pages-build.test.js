import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

test('GitHub Pages build contains relative app modules', async () => {
  await Promise.all([
    access('dist/index.html', constants.R_OK),
    access('dist/app.js', constants.R_OK),
    access('dist/styles.css', constants.R_OK),
    access('dist/src/analysis-service.js', constants.R_OK),
    access('dist/src/pose-service.js', constants.R_OK),
    access('dist/src/pose-geometry.js', constants.R_OK),
    access('dist/.nojekyll', constants.R_OK)
  ]);
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /src="app\.js"/);
  assert.match(html, /href="styles\.css"/);
  assert.doesNotMatch(html, /(?:src|href)="\//);
});
