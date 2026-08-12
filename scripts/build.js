import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('styles.css', 'dist/styles.css'),
  cp('app.js', 'dist/app.js'),
  cp('src/analysis-service.js', 'dist/src/analysis-service.js')
]);
console.log('Static production files written to dist/');
