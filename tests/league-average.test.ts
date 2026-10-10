import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, averageRadar } from '../lib/engine.ts';
import type { Match, Player } from '../lib/model.ts';

const players = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, archived: false, attributes: { overall: 50 } })) as unknown as Player[];
const goals = { a: 0, b: 0, c: 0, d: 8 } as Record<string, number>;
const matches = [{ id: 'm1', seasonId: 's', date: '2026-01-01T20:00:00Z', status: 'finished', scoreA: 8, scoreB: 0, participants: players.map((p, i) => ({ playerId: p.id, team: i < 2 ? 'A' : 'B', stats: { goals: goals[p.id] } })) }] as unknown as Match[];

test('league average radar scores the mean measure, not a fixed 50', () => {
  const population = aggregate(players, matches);
  const finition = averageRadar(population, 1).find(a => a.name === 'Finition');
  // Mean of 2 goals per match is better than three of the four players.
  assert.equal(finition?.value, 75);
});

test('league average radar stays unknown without enough comparable players', () => {
  const population = aggregate(players.slice(0, 2), [{ ...matches[0], participants: matches[0].participants.slice(0, 2) }]);
  assert.ok(averageRadar(population, 1).every(a => a.value === null));
});
