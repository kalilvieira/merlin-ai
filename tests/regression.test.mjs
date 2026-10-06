import test from 'node:test';
import assert from 'node:assert/strict';
import { readBrowserList, saveBrowserList, listKey } from '../lib/browser-list.js';
import { seedProducts, seedConfig, optimizeRoute } from '../lib/domain.js';

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
async function post(body) {
  return fetch(base + '/api/merlin', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: base },
    body: JSON.stringify(body),
  });
}
test('carregamento sem banco disponibiliza catálogo e modo navegador', async () => {
  const response = await fetch(base + '/api/merlin');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.storage, 'browser');
  assert.equal(body.products.length, seedProducts.length);
});
test('exemplos e refinamento funcionam mesmo sem salvar telemetria', async () => {
  for (const query of ['Tapar um cano', 'Pintar uma parede', 'Instalar uma tomada', '50 mm']) {
    const response = await post({ action: 'search', query, store: 'salvador', history: ['Tapar um cano'] });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.products.length > 0, query);
    if (query === '50 mm') assert.ok(body.products.every(p => p.attributes.includes('50')));
  }
});
test('lista local mantém adição, quantidade e marcação ao recarregar', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) };
  assert.equal(readBrowserList(storage, seedProducts), null);
  const items = [{ id: seedProducts[0].id, quantity: 2, checked: true }];
  saveBrowserList(storage, items);
  assert.deepEqual(readBrowserList(storage, seedProducts), items);
  storage.setItem(listKey, JSON.stringify([...items, { id: 'inexistente', quantity: 1, checked: false }, null]));
  assert.deepEqual(readBrowserList(storage, seedProducts), items);
  assert.throws(() => saveBrowserList({ setItem() { throw Error('quota'); } }, items));
});
test('rotas individuais e múltiplas alcançam produtos disponíveis', () => {
  const items = seedProducts.filter(p => p.stock.salvador > 0);
  for (const targets of [...items.map(p => [p]), items.slice(0, 10)]) {
    const route = optimizeRoute({ x: 0, y: 10 }, targets, seedConfig.blocked);
    assert.equal(route.items.length, targets.length);
    assert.ok(route.path.length > 0);
    assert.ok(route.distance > 0);
  }
});
test('registro de início de rota não falha sem banco; validação continua ativa', async () => {
  assert.equal((await post({ action: 'event', type: 'route_start', data: { store: 'salvador' } })).status, 200);
  assert.equal((await post({ action: 'search', query: '', store: 'salvador' })).status, 400);
  assert.equal((await post({ action: 'list', items: [{ id: 'invalid', quantity: 1, checked: false }] })).status, 400);
});
