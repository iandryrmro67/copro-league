import test from 'node:test';
import assert from 'node:assert/strict';
import { divisionFor, cardRating } from '../lib/divisions.ts';
import type { Summary } from '../lib/engine.ts';
const population = Array.from({ length: 20 }, (_, i) => ({ player: { id: String(i), archived: false }, appearances: 6, elo: 900 + i * 10 } as Summary));
test('divisions follow ELO season percentiles', () => {
  assert.equal(divisionFor('19', population)?.id, 'ligue1');
  assert.equal(divisionFor('16', population)?.id, 'ligue2');
  assert.equal(divisionFor('10', population)?.id, 'national');
  assert.equal(divisionFor('9', population)?.id, 'regional');
});
test('ties share a division and unplayed/archived players cannot alter the population', () => {
  const tied = population.map(s => ({ ...s, elo: 1000 }));
  assert.ok(tied.every(s => divisionFor(s.player.id, tied)?.id === 'national'));
  const extra = { ...population[0], player: { ...population[0].player, id: 'new' }, appearances: 0, elo: 9999 };
  assert.equal(divisionFor('new', [...population, extra]), null);
  assert.equal(divisionFor('19', [...population, extra])?.id, 'ligue1');
  assert.equal(divisionFor('19', [{ ...population[19], player: { ...population[19].player, archived: true } }, population[0]]), null);
  assert.equal(divisionFor('0', [population[0]]), null);
});
test('card score preserves unknown and zero and clamps to 99', () => {
  assert.equal(cardRating(null), null); assert.equal(cardRating(undefined), null);
  assert.equal(cardRating(0), 0); assert.equal(cardRating(7.52), 75);
  assert.equal(cardRating(10), 99); assert.equal(cardRating(NaN), null);
});
