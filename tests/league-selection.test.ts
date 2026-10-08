import test from 'node:test';
import assert from 'node:assert/strict';
import type { League, Match, Player, Season } from '../lib/model.ts';
import { defaultSeason, homePitch, matchTabFromQuery, editorStepFromQuery, annotationTimestamp } from '../lib/league-selection.ts';
const season = (id: string, start = '', demo = false): Season => ({ id, name: `Saison ${id}`, start, end: '', demo, status: 'active', contribution: 1, winnerId: null, minParticipation: .3, version: 1 });
const player = (id: string): Player => ({ id, name: id, photo: '', bio: '', funFacts: '', archived: false, demo: false, attributes: {}, version: 1 });
const match = (id: string, date: string, status: Match['status'], ids: string[]): Match => ({ id, date, status, seasonId: '3', number: 1, duration: 60, location: '', scoreA: null, scoreB: null, mvpId: null, level: 1, video: '', events: [], trackedKeys: [], version: 1, participants: ids.map((playerId, i) => ({ playerId, team: i % 2 ? 'B' : 'A', stats: {} })) });
const league = (matches: Match[]): League => ({ matches, players: [player('a'), player('b')], seasons: [], settings: {} as League['settings'], admin: false, bootstrap: false, user: null });
test('latest actual season wins regardless of insertion order or demo dates', () => {
  const seasons = [season('2'), season('3', '2026-09-22'), season('99', '2027-01-01', true)];
  assert.equal(defaultSeason(seasons), '3');
  assert.equal(defaultSeason([...seasons].reverse()), '3');
  assert.equal(defaultSeason([season('2'), season('10')]), '10');
});
test('refresh preserves a chosen season or career, and recovers a deleted selection', () => {
  const seasons = [season('2'), season('3', '2026-09-22')];
  assert.equal(defaultSeason(seasons, '2'), '2');
  assert.equal(defaultSeason(seasons, 'career'), 'career');
  assert.equal(defaultSeason(seasons, 'deleted'), '3');
});
test('empty upcoming fixture retains the latest real teams on the home pitch', () => {
  const games = [match('last', '2026-10-04', 'finished', ['a', 'b']), match('next', '2026-10-10', 'scheduled', [])];
  const result = homePitch(league(games), games, Date.parse('2026-10-08'));
  assert.equal(result.match?.id, 'last');
  assert.deepEqual(result.roster.map(p => p.player.id), ['a', 'b']);
  assert.deepEqual(result.roster.map(p => p.side), ['A', 'B']);
});
test('known upcoming teams take priority and cancelled or deleted rosters do not', () => {
  const games = [match('last', '2026-10-04', 'finished', ['a']), match('next', '2026-10-10', 'scheduled', ['b']), match('cancelled', '2026-10-09', 'cancelled', ['a'])];
  assert.equal(homePitch(league(games), games, Date.parse('2026-10-08')).match?.id, 'next');
  games[1].participants = [{ playerId: 'deleted', team: 'A', stats: {} }];
  assert.equal(homePitch(league(games), games, Date.parse('2026-10-08')).match?.id, 'last');
});
test('a new season falls back to the previous real teams, then actual league players', () => {
  const old = match('old', '', 'finished', ['a', 'b']);
  assert.equal(homePitch(league([old]), [], Date.now()).match?.id, 'old');
  const result = homePitch(league([]), [], Date.now());
  assert.equal(result.match, undefined); assert.equal(result.roster.length, 2);
  assert.ok(result.roster.every(p => p.side === null));
});
test('deep links retain timeline/stats tabs and editor steps for historical matches', () => {
  assert.equal(matchTabFromQuery('timeline'), 'timeline');
  assert.equal(matchTabFromQuery('stats'), 'stats');
  assert.equal(matchTabFromQuery('invalid'), 'summary');
  assert.equal(editorStepFromQuery('video'), 'video');
  assert.equal(editorStepFromQuery('result'), 'result');
  assert.equal(editorStepFromQuery(null), 'details');
});

test('editing an untimed historical action preserves unknown time without inventing a timestamp', () => {
  assert.equal(annotationTimestamp('', { timestamp: null }), null);
  assert.equal(annotationTimestamp('120:02', { timestamp: null }), 7202);
  assert.equal(annotationTimestamp(''), undefined);
  assert.equal(annotationTimestamp('', { timestamp: 42 }), undefined);
  assert.equal(annotationTimestamp('1:99'), undefined);
});
