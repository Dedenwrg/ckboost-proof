import assert from 'node:assert/strict';
import { mkdtemp, readdir, rmdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { GET, POST } from './app/api/articles/route.ts';
import { GET as read } from './app/api/articles/[id]/route.ts';

test('only authorized publishers can create a public preview and only public fields are returned', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'unseal-test-catalog-'));
  const token = randomUUID();
  process.env.CATALOG_DATA_DIR = folder;
  process.env.CATALOG_PUBLISH_TOKEN = token;
  const input = {
    id: randomUUID(), title: 'A public title', author: 'Writer', category: 'Tech',
    preview: 'The free preview.', price: '2.50', content: 'premium', raw: 'private offer',
  };
  const publish = (value, auth) => POST(new Request('http://localhost/api/articles', {
    method: 'POST',
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    body: JSON.stringify(value),
  }));
  try {
    assert.equal((await publish(input)).status, 401);
    assert.equal((await publish({ ...input, id: '../article' }, token)).status, 400);
    assert.equal((await publish(input, token)).status, 201);
    assert.equal((await publish(input, token)).status, 200);
    assert.equal((await publish({ ...input, title: 'Changed' }, token)).status, 409);
    const list = await (await GET()).json();
    assert.equal(list.articles.length, 1);
    const [article] = list.articles;
    assert.deepEqual(Object.keys(article).sort(), ['author', 'category', 'id', 'preview', 'price', 'publishedAt', 'title']);
    assert.equal(article.price, '2.5');
    assert.deepEqual(await (await read(null, { params: Promise.resolve({ id: input.id }) })).json(), article);
  } finally {
    for (const file of await readdir(folder)) await unlink(join(folder, file));
    await rmdir(folder);
  }
});
