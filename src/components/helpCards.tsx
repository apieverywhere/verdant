/** Illustrated "How to play" cards, converted from the design artboards (Main, Caro5, Tidepool). */
import type { HelpCard } from './HowToPlay';

export const TIC_TAC_TOE_HELP: HelpCard[] = [
  {
    title: 'Take turns',
    text: 'X goes first in round one, then players alternate. In the next round, whoever lost goes first. Click an empty square to place your mark. Against the computer, you are X.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="X has played the corner, O the center, and X is about to click the top right square" className="help-art"><text x="26" y="50" textAnchor="middle" fontSize="17" fontWeight="800" fill="#ff7a6b" fontFamily="sans-serif">X</text><path d="M26 57v13M21 65l5 6 5-6" fill="none" stroke="#c3d6e3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><text x="26" y="92" textAnchor="middle" fontSize="17" fontWeight="800" fill="#4fd8cc" fontFamily="sans-serif">O</text><rect x="50" y="10" width="100" height="100" rx="8" fill="#1f3346" stroke="#d6ad6c" strokeWidth="2" /><rect x="55" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><path d="M61 21l16 16M77 21l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /><circle cx="100" cy="60" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><path d="M123 21l16 16M139 21l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.4" /><path d="M137 33v17l4.5-4.5 3.5 7 3-1.5-3.5-7h6z" fill="#ffffff" stroke="#241a3a" strokeWidth="1.4" strokeLinejoin="round" /></svg>
    ),
  },
  {
    title: 'Get 3 in a row',
    text: 'Line up three of your marks across, down or diagonally to win. A gold bar lights up the winning line.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Three X marks on a diagonal joined by a gold winning line" className="help-art"><rect x="50" y="10" width="100" height="100" rx="8" fill="#1f3346" stroke="#d6ad6c" strokeWidth="2" /><rect x="55" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><path d="M61 21l16 16M77 21l-16 16M92 52l16 16M108 52l-16 16M123 83l16 16M139 83l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /><circle cx="100" cy="29" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><circle cx="131" cy="60" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><path d="M66 26L134 94" stroke="#ffd27a" strokeWidth="5" strokeLinecap="round" opacity="0.9" /></svg>
    ),
  },
  {
    title: 'Block the threat',
    text: 'When your opponent has two in a line, take the third square before they do.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="O has two in the middle row and X blocks the third square" className="help-art"><rect x="50" y="10" width="100" height="100" rx="8" fill="#1f3346" stroke="#d6ad6c" strokeWidth="2" /><rect x="55" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><path d="M69 60H131" stroke="#2fb8ad" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" /><path d="M61 21l16 16M77 21l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /><circle cx="69" cy="60" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><circle cx="100" cy="60" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><rect x="114" y="43" width="34" height="34" rx="7" fill="none" stroke="#ffd27a" strokeWidth="3" /><path d="M123 52l16 16M139 52l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /></svg>
    ),
  },
  {
    title: 'Only 3 marks each',
    text: 'Placing your 4th mark removes your oldest one first. Against the computer it fades and blinks as a warning; with 2 players you must remember it. The same position 3 times is a draw.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="X has three marks; the oldest, in the top left corner, is faded because it vanishes on X’s next move" className="help-art"><rect x="50" y="10" width="100" height="100" rx="8" fill="#1f3346" stroke="#d6ad6c" strokeWidth="2" /><rect x="55" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="15" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="46" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="55" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="86" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="117" y="77" width="28" height="28" rx="4" fill="#f0e5d1" /><rect x="53" y="13" width="32" height="32" rx="6" fill="none" stroke="#ffd27a" strokeWidth="2.5" strokeDasharray="4 3" /><path d="M61 21l16 16M77 21l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.35" /><path d="M123 21l16 16M139 21l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /><path d="M61 83l16 16M77 83l-16 16" stroke="#ff6f5e" strokeWidth="4.5" strokeLinecap="round" fill="none" /><circle cx="100" cy="60" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><circle cx="100" cy="91" r="8.5" fill="none" stroke="#2fb8ad" strokeWidth="4.5" /><path d="M169 24l12 12M181 24l-12 12" stroke="#ff6f5e" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.35" /><path d="M169 48l12 12M181 48l-12 12" stroke="#ff6f5e" strokeWidth="3.5" strokeLinecap="round" fill="none" /><path d="M169 72l12 12M181 72l-12 12" stroke="#ff6f5e" strokeWidth="3.5" strokeLinecap="round" fill="none" /><text x="175" y="106" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">3 max</text></svg>
    ),
  },
  {
    title: 'Move the camera',
    text: 'Drag to look at the board from any side, scroll to zoom. A quick click without dragging places your mark.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Drag to rotate the view, scroll the mouse wheel to zoom" className="help-art"><path d="M38 60a26 26 0 1 1 9 19.7" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /><path d="M38 87l9-7.3-1.5 10.5" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><text x="64" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Drag = rotate</text><path d="M134 21l6-6 6 6M134 87l6 6 6-6" fill="none" stroke="#ffd27a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="124" y="28" width="32" height="50" rx="16" fill="none" stroke="#c3d6e3" strokeWidth="3" /><path d="M140 28v12" stroke="#c3d6e3" strokeWidth="2" /><rect x="137" y="36" width="6" height="11" rx="3" fill="#ffd27a" /><text x="140" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Scroll = zoom</text></svg>
    ),
  },
];

export const FIRE_WATER_HELP: HelpCard[] = [
  {
    title: 'Drop a piece',
    text: 'Click any square. Your piece falls and lands on top of whatever is already there. Each stack holds up to 5 pieces.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Side view: a Fire piece falls down a stack and lands on top of the pieces already there" className="help-art"><rect x="16" y="98" width="168" height="10" rx="3" fill="#1f3346" /><rect x="16" y="98" width="168" height="2" fill="#d6ad6c" /><rect x="27" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="57" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="57" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="54" width="26" height="14" rx="4" fill="none" stroke="#ffd27a" strokeWidth="2" strokeDasharray="4 3" /><rect x="87" y="6" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" opacity="0.6" /><path d="M100 24v24M94.5 43l5.5 6.5 5.5-6.5" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    title: 'Fire vs Water',
    text: 'Players take turns. Whoever lost the last round goes first in the next. Against the computer, you are Fire.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="A Fire piece with a flame on top and a Water piece with a drop on top" className="help-art"><rect x="37" y="45" width="56" height="40" fill="#ff6a3d" /><ellipse cx="65" cy="85" rx="28" ry="10" fill="#ff6a3d" /><rect x="37" y="45" width="56" height="5" fill="#ffb347" /><ellipse cx="65" cy="45" rx="28" ry="10" fill="#ff8a5c" /><path transform="translate(56.6 34.5) scale(0.7)" d="M12 2.5c.9 3.3 4.8 5.4 4.8 10.4a4.8 4.8 0 0 1-9.6 0c0-2.4 1.2-3.9 2.5-4.9.1 1.7.9 2.8 1.9 3.2.2-3.4-.6-5.9.4-8.7z" fill="#ffe08a" /><text x="65" y="112" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffb08f" fontFamily="sans-serif">Fire</text><rect x="107" y="45" width="56" height="40" fill="#3d9bff" /><ellipse cx="135" cy="85" rx="28" ry="10" fill="#3d9bff" /><rect x="107" y="45" width="56" height="5" fill="#9fd4ff" /><ellipse cx="135" cy="45" rx="28" ry="10" fill="#6cb6ff" /><path transform="translate(126.6 34.5) scale(0.7)" d="M12 3c3.1 4.1 6.2 7.4 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10.4 8.9 7.1 12 3z" fill="#eaf6ff" /><text x="135" y="112" textAnchor="middle" fontSize="12" fontWeight="700" fill="#9fd4ff" fontFamily="sans-serif">Water</text></svg>
    ),
  },
  {
    title: 'Win: 4 across',
    text: 'Four of your pieces in a straight line on the same level. Rows, columns and diagonals across the board all count.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Four Fire pieces side by side on the bottom level, joined by a gold line" className="help-art"><rect x="16" y="98" width="168" height="10" rx="3" fill="#1f3346" /><rect x="16" y="98" width="168" height="2" fill="#d6ad6c" /><rect x="27" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="57" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="57" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="117" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="147" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><path d="M32 91H138" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: 'Win: 4 straight up',
    text: 'Stack four of your own pieces on top of each other in one square.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Four Fire pieces stacked in one square, joined by a vertical gold line" className="help-art"><rect x="16" y="98" width="168" height="10" rx="3" fill="#1f3346" /><rect x="16" y="98" width="168" height="2" fill="#d6ad6c" /><rect x="57" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="69" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="54" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="39" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="117" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><path d="M100 94V43" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: 'Win: 4 on a slant',
    text: 'Climb like a staircase: each piece one square over and one level higher. Slants can run in any direction through the board.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Four Fire pieces climbing like a staircase, one square over and one level up each time" className="help-art"><rect x="16" y="98" width="168" height="10" rx="3" fill="#1f3346" /><rect x="16" y="98" width="168" height="2" fill="#d6ad6c" /><rect x="27" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="57" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="57" y="69" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="54" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="117" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="69" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="117" y="54" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="39" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><path d="M40 91L130 46" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: 'Watch the spot above',
    text: 'Fire needs the gold spot, but it’s still in the air. Whoever drops into the red spot first lets Fire land on top and win. Never fill the space right under your opponent’s winning spot.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Fire has three on a staircase. The winning spot is floating above an empty spot outlined in red" className="help-art"><rect x="16" y="98" width="168" height="10" rx="3" fill="#1f3346" /><rect x="16" y="98" width="168" height="2" fill="#d6ad6c" /><path d="M40 91L130 46" stroke="#ffd27a" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" /><rect x="27" y="84" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="57" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="57" y="69" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="87" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="87" y="54" width="26" height="14" rx="4" fill="#ff6a3d" stroke="#ffb347" strokeWidth="1.5" /><rect x="117" y="84" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="69" width="26" height="14" rx="4" fill="#3d9bff" stroke="#9fd4ff" strokeWidth="1.5" /><rect x="117" y="54" width="26" height="14" rx="4" fill="none" stroke="#ff8a7a" strokeWidth="2" strokeDasharray="4 3" /><rect x="117" y="39" width="26" height="14" rx="4" fill="none" stroke="#ffd27a" strokeWidth="2.2" strokeDasharray="4 3" /><path d="M126 58l8 6M134 58l-8 6" stroke="#ff8a7a" strokeWidth="2" strokeLinecap="round" /><text x="130" y="50" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffd27a" fontFamily="sans-serif">!</text></svg>
    ),
  },
  {
    title: 'Move the camera',
    text: 'Drag to look around the board from any side, scroll to zoom. A quick click without dragging drops a piece.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Drag to rotate the view, scroll the mouse wheel to zoom" className="help-art"><path d="M38 60a26 26 0 1 1 9 19.7" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /><path d="M38 87l9-7.3-1.5 10.5" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><text x="64" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Drag = rotate</text><path d="M134 21l6-6 6 6M134 87l6 6 6-6" fill="none" stroke="#ffd27a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="124" y="28" width="32" height="50" rx="16" fill="none" stroke="#c3d6e3" strokeWidth="3" /><path d="M140 28v12" stroke="#c3d6e3" strokeWidth="2" /><rect x="137" y="36" width="6" height="11" rx="3" fill="#ffd27a" /><text x="140" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Scroll = zoom</text></svg>
    ),
  },
];

export const TIDEPOOL_HELP: HelpCard[] = [
  {
    title: 'The goal',
    text: "Each side starts with 14 marbles. Push 6 of your opponent's marbles off the edge of the board to win. Pearl moves first in round one, then the starter alternates. Against the computer, you are Pearl.",
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="A Coral marble falls off the board into a tray holding six Coral marbles" className="help-art"><path d="M20 40 H180" stroke="#d6ad6c" strokeWidth="3" strokeLinecap="round" /><circle cx="100" cy="24" r="11" fill="#ff6f5e" stroke="#ffb3a8" strokeWidth="1.5" /><path d="M100 40v18M95 53l5 6 5-6" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" /><rect x="25" y="70" width="150" height="34" rx="17" fill="#12304a" stroke="#d6ad6c" strokeWidth="2" /><circle cx="45" cy="87" r="9" fill="#ff6f5e" /><circle cx="67" cy="87" r="9" fill="#ff6f5e" /><circle cx="89" cy="87" r="9" fill="#ff6f5e" /><circle cx="111" cy="87" r="9" fill="#ff6f5e" /><circle cx="133" cy="87" r="9" fill="#ff6f5e" /><circle cx="155" cy="87" r="9" fill="#ff6f5e" opacity="0.45" /></svg>
    ),
  },
  {
    title: 'Move 1, 2 or 3 in a line',
    text: 'On your turn, click 1, 2 or 3 of your marbles that sit next to each other in a straight line. Gold markers show where they can go; click one to move them one space.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Three Pearl marbles in a row slide one space forward along their line into an empty hole" className="help-art"><circle cx="44" cy="70" r="11" fill="#1f3346" /><circle cx="72" cy="70" r="11" fill="#1f3346" /><circle cx="100" cy="70" r="11" fill="#1f3346" /><circle cx="128" cy="70" r="11" fill="#1f3346" /><circle cx="156" cy="70" r="11" fill="#1f3346" /><circle cx="44" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="72" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="100" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="128" cy="70" r="12" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeDasharray="4 3" /><path d="M44 44 H134 M128 38l7 6-7 6" fill="none" stroke="#ffd27a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    title: 'Step sideways',
    text: 'A line of 2 or 3 can also step sideways together, as long as every space it moves into is empty. Sideways moves can never push.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Three Pearl marbles step sideways together into the row of empty holes below" className="help-art"><circle cx="44" cy="44" r="11" fill="#1f3346" /><circle cx="72" cy="44" r="11" fill="#1f3346" /><circle cx="100" cy="44" r="11" fill="#1f3346" /><circle cx="128" cy="44" r="11" fill="#1f3346" /><circle cx="156" cy="44" r="11" fill="#1f3346" /><circle cx="58" cy="84" r="11" fill="#1f3346" /><circle cx="86" cy="84" r="11" fill="#1f3346" /><circle cx="114" cy="84" r="11" fill="#1f3346" /><circle cx="142" cy="84" r="11" fill="#1f3346" /><circle cx="72" cy="44" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="100" cy="44" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="128" cy="44" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="86" cy="84" r="12" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeDasharray="4 3" /><circle cx="114" cy="84" r="12" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeDasharray="4 3" /><circle cx="142" cy="84" r="12" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeDasharray="4 3" /><path d="M76 56l6 14M104 56l6 14M132 56l6 14" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeLinecap="round" /></svg>
    ),
  },
  {
    title: 'Push with more',
    text: "Moving along its line, a bigger group can push a smaller one: 3 push 2, 3 push 1, 2 push 1. Equal numbers can't push, and you can't push if one of your own marbles is in the way.",
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Three Pearl marbles push two Coral marbles one space along the line" className="help-art"><circle cx="16" cy="70" r="11" fill="#1f3346" /><circle cx="44" cy="70" r="11" fill="#1f3346" /><circle cx="72" cy="70" r="11" fill="#1f3346" /><circle cx="100" cy="70" r="11" fill="#1f3346" /><circle cx="128" cy="70" r="11" fill="#1f3346" /><circle cx="156" cy="70" r="11" fill="#1f3346" /><circle cx="184" cy="70" r="11" fill="#1f3346" /><circle cx="16" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="44" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="72" cy="70" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="100" cy="70" r="11" fill="#ff6f5e" stroke="#ffb3a8" strokeWidth="1.5" /><circle cx="128" cy="70" r="11" fill="#ff6f5e" stroke="#ffb3a8" strokeWidth="1.5" /><path d="M20 42 H166 M160 36l7 6-7 6" fill="none" stroke="#ffd27a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><text x="44" y="102" textAnchor="middle" fontSize="12" fontWeight="800" fill="#f1ece2" fontFamily="sans-serif">3</text><text x="114" y="102" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffb3a8" fontFamily="sans-serif">2</text></svg>
    ),
  },
  {
    title: 'Push them into the sea',
    text: "When the space behind your opponent's marbles is the edge of the board, your push sends the last one off. It drops into the gutter, rolls down the ramp and lands in the tray. Keep your own marbles away from the edge!",
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Two Pearl marbles push a Coral marble over the edge of the board into the sea" className="help-art"><rect x="148" y="0" width="52" height="120" fill="#2f8f9a" opacity="0.35" /><path d="M148 18 V102" stroke="#d6ad6c" strokeWidth="3" strokeLinecap="round" /><circle cx="66" cy="60" r="11" fill="#1f3346" /><circle cx="94" cy="60" r="11" fill="#1f3346" /><circle cx="122" cy="60" r="11" fill="#1f3346" /><circle cx="66" cy="60" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="94" cy="60" r="11" fill="#f1ece2" stroke="#c9bfae" strokeWidth="1.5" /><circle cx="122" cy="60" r="11" fill="#ff6f5e" stroke="#ffb3a8" strokeWidth="1.5" opacity="0.5" /><circle cx="174" cy="92" r="11" fill="#ff6f5e" stroke="#ffb3a8" strokeWidth="1.5" /><path d="M134 54 Q160 52 170 76" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 3" /><path d="M164 72l6 6 3-8" fill="none" stroke="#ffd27a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
  },
  {
    title: 'Move the camera',
    text: 'Drag to look around the board, scroll to zoom. Click an empty spot to clear your selection.',
    art: (
      <svg viewBox="0 0 200 120" role="img" aria-label="Drag to rotate the view, scroll the mouse wheel to zoom" className="help-art"><path d="M38 60a26 26 0 1 1 9 19.7" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" /><path d="M38 87l9-7.3-1.5 10.5" fill="none" stroke="#ffd27a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><text x="64" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Drag = rotate</text><path d="M134 21l6-6 6 6M134 87l6 6 6-6" fill="none" stroke="#ffd27a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><rect x="124" y="28" width="32" height="50" rx="16" fill="none" stroke="#c3d6e3" strokeWidth="3" /><path d="M140 28v12" stroke="#c3d6e3" strokeWidth="2" /><rect x="137" y="36" width="6" height="11" rx="3" fill="#ffd27a" /><text x="140" y="110" textAnchor="middle" fontSize="11" fontWeight="600" fill="#c3d6e3" fontFamily="sans-serif">Scroll = zoom</text></svg>
    ),
  },
];
