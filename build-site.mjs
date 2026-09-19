import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const client = resolve(dist, 'client');

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'server'), { recursive: true });
await cp(resolve(root, 'site-worker.js'), resolve(dist, 'server', 'index.js'));

for (const name of ['index.html', 'src', 'styles', 'vendor', 'assets']) {
  await cp(resolve(root, name), resolve(client, name), { recursive: true });
}
