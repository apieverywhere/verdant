/**
 * Exhaustive check (≈ 5 minutes): the hard AI picks an optimal move in EVERY reachable position.
 * The unit tests check a 1/40 sample; run this after changing the AI:  bun run verify:ai
 */
import { DIFFICULTY, search } from '../src/lib/game/ai';
import { createGame } from '../src/lib/game/rules';
import { solve } from '../tests/solver';

const t0 = performance.now();
const sol = solve();
const counts = { WIN: 0, LOSS: 0, DRAW: 0 };
for (const [k, v] of sol.result) if (!k.startsWith('T')) counts[v.label]++;
console.log(`positions: ${sol.states.size}`, counts, `start position: ${sol.get(createGame('X')).label} in ${sol.get(createGame('X')).dist} plies`);

let bad = 0, slowest = 0, done = 0;
for (const s of sol.states.values()) {
  const label = sol.get(s).label;
  const t = performance.now();
  const { moves } = search(s, DIFFICULTY.hard.depth);
  slowest = Math.max(slowest, performance.now() - t);
  for (const m of moves) {
    const after = sol.after(s, m).label;
    if ((label === 'WIN' && after !== 'LOSS') || (label === 'DRAW' && after === 'WIN')) {
      bad++;
      console.log('suboptimal', s.board.map((c) => c ?? '.').join(''), s.queues, s.turn, '→', m);
      break;
    }
  }
  if (++done % 20000 === 0) console.log(`  ${done}/${sol.states.size}…`);
}
console.log(`suboptimal: ${bad}, slowest move: ${slowest.toFixed(1)} ms, total ${((performance.now() - t0) / 1000).toFixed(0)} s`);
process.exit(bad ? 1 : 0);
