/**
 * Tidepool AI benchmark: plays full games between two players (sides alternate) and reports results and
 * time per move. Games longer than MAX_PLIES are scored as unfinished.
 *
 *   bun scripts/bench-tidepool.ts [games=10]
 */
import { chooseMove, designMove } from '../src/lib/tidepool/ai';
import { applyMove, allMoves, createGame, type Move, type TidepoolState } from '../src/lib/tidepool/rules';
import { HARD_NODES, searchMove, TUNE } from '../src/lib/tidepool/search';

// Optional weight overrides for tuning, e.g. TUNE='{"attack":120}'
if (process.env.TUNE) Object.assign(TUNE, JSON.parse(process.env.TUNE));
import { rng } from '../src/lib/scene/terrain';

type Bot = { name: string; play: (s: TidepoolState, r: () => number) => Move | null };
const MAX_PLIES = 400;

const random: Bot = { name: 'random', play: (s, r) => { const m = allMoves(s.board, s.turn); return m[Math.floor(r() * m.length)] ?? null; } };
const easy: Bot = { name: 'easy', play: (s, r) => chooseMove(s, 'easy', r) };
const design: Bot = { name: 'design-2ply', play: (s, r) => designMove(s, r) };
const hard = (nodes: number): Bot => ({ name: `search-${nodes / 1000}k`, play: (s, r) => searchMove(s, r, nodes).move });

function match(a: Bot, b: Bot, games: number) {
  const res = { a: 0, b: 0, open: 0 }, ms: Record<string, number[]> = { [a.name]: [], [b.name]: [] };
  let pushes = { a: 0, b: 0 };
  for (let g = 0; g < games; g++) {
    const r = rng(1000 + g);
    let s = createGame('X');
    const aIsX = g % 2 === 0;
    let plies = 0;
    while (!s.winner && plies < MAX_PLIES) {
      const bot = (s.turn === 'X') === aIsX ? a : b;
      const t0 = performance.now();
      const mv = bot.play(s, r);
      ms[bot.name].push(performance.now() - t0);
      if (!mv) break;
      const n = applyMove(s, mv);
      if (n === s) throw new Error(`${bot.name} played an illegal move`);
      s = n;
      plies++;
    }
    const aSide = aIsX ? 'X' : 'O', bSide = aIsX ? 'O' : 'X';
    pushes.a += s.lost[bSide];
    pushes.b += s.lost[aSide];
    if (!s.winner) res.open++;
    else if (s.winner === aSide) res.a++;
    else res.b++;
    process.stdout.write(`  game ${g + 1}: ${s.winner ? (s.winner === aSide ? a.name : b.name) + ' wins' : 'unfinished'} (${plies} plies, ${s.lost[bSide]}–${s.lost[aSide]})\n`);
  }
  const avg = (x: number[]) => (x.reduce((p, c) => p + c, 0) / Math.max(1, x.length)).toFixed(0);
  const max = (x: number[]) => Math.max(...x).toFixed(0);
  console.log(`${a.name} vs ${b.name}: ${res.a} wins, ${res.b} losses, ${res.open} unfinished · marbles pushed off ${pushes.a}–${pushes.b} · ms/move ${a.name} avg ${avg(ms[a.name])} max ${max(ms[a.name])}, ${b.name} avg ${avg(ms[b.name])}\n`);
}

const games = Number(process.argv[2] ?? 10);
const which = process.argv[3] ?? 'all';
if (which === 'all' || which === 'design') {
  match(design, random, games);
  match(design, easy, games);
}
if (which === 'all' || which === 'hard') {
  const nodes = Number(process.env.NODES ?? HARD_NODES);
  match(hard(nodes), random, games);
  match(hard(nodes), design, games);
}
if (which === 'budget') match(hard(Number(process.argv[4] ?? 400_000)), hard(Number(process.argv[5] ?? 120_000)), games);
if (which === 'vsmedium') match(hard(Number(process.env.NODES ?? HARD_NODES)), design, games);
if (which === 'vseasy') match(hard(Number(process.env.NODES ?? HARD_NODES)), easy, games);
