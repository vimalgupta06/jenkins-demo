import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const app = createApp();
let base;
before(async () => {
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.address().port}`;
});
after(() => new Promise(resolve => app.close(resolve)));

test('homepage displays the demo', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Jenkins/);
});
test('health endpoint reports readiness', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});
test('unknown routes return 404', async () => {
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});
test('write requests are rejected', async () => {
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
