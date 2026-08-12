import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all([
  cp('index.html', 'dist/index.html'),
  cp('styles.css', 'dist/styles.css'),
  cp('app.js', 'dist/app.js'),
  cp('src', 'dist/src', { recursive: true })
]);
// Disable Jekyll so GitHub Pages serves the generated static modules verbatim.
await writeFile('dist/.nojekyll', '');
console.log('Static production files written to dist/');
