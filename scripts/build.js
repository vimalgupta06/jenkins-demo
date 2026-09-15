import { cp, mkdir, rm } from 'node:fs/promises';

// Plain JavaScript needs no compilation; copy the deployable files into dist.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
console.log('Build complete: dist/');
