'use client';

/**
 * Interface text in every supported language. `en` is the source; `vi` must have exactly the same keys
 * (the `Dict` type enforces it), so a missing translation is a type error rather than a blank label.
 * Entries that take values are functions. Game and site names (Verdant, Lantern Line, …) are not translated.
 * Page metadata, structured data and the legal pages stay in English.
 */
import type { GameId } from './games';
import type { Player } from './game/types';
import { useSettings, type Lang } from './settings';

const en = {
  // ------------------------------------------------------------- shared HUD
  backToVerdant: 'Back to Verdant',
  score: 'Score',
  noWebGL:
    'WebGL isn’t available in this browser, so the 3D scene can’t be drawn. Try a recent version of Chrome, Edge or Firefox — you can still play with the keyboard (Tab key).',
  difficulty: 'Difficulty',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  gameMode: 'Game mode',
  twoPlayers: '2 players',
  vsComputer: 'vs Computer',
  newGame: 'New game',
  resetScore: 'Reset score',
  /** Phone tab that opens the game toolbar. */
  options: 'Options',
  draws: 'Draws',
  you: 'You',
  computer: 'Computer',
  cpu: 'CPU',
  wins: (n: number) => `Wins ${n}`,
  loading: 'Loading',
  boardKeyboard: 'Board (keyboard)',

  // ------------------------------------------------------------- how to play
  howToPlay: 'How to play',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  gotIt: 'Got it',
  slideOf: (i: number, n: number) => `${i} of ${n}`,

  // ------------------------------------------------------------- settings
  settings: 'Settings',
  language: 'Language',
  sound: 'Sound',
  music: 'Music',
  sfx: 'Sound effects',
  muted: 'Off',
  audioSoon: 'Music and sound effects are on the way. Your volume choices are saved for when they arrive.',
  done: 'Done',

  // ------------------------------------------------------------- site header / footer
  mainNav: 'Main navigation',
  navGames: 'Games',
  navAbout: 'About',
  playNow: 'Play now',
  playNamed: (name: string) => `Play ${name}`,
  followMe: 'Follow me on',
  socialNav: 'Social media',
  legalNav: 'Legal and site links',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  sitemap: 'Sitemap',
  home: 'Verdant home',

  // ------------------------------------------------------------- lobby
  heroKicker: 'Light games, right in your browser',
  heroTitle: 'Classic games. Breathtaking worlds.',
  heroLead: 'No install, no account. Open it and play, with a friend beside you or against the computer.',
  seeAllGames: 'See all games',
  allGames: 'All games',
  gamesLive: (n: number) => `${n} games live · more coming soon`,
  badgeNew: 'NEW',
  play: 'Play',
  moreGames: 'More games',
  comingSoon: 'Coming soon',
  about: [
    'Verdant is a small collection of relaxing games for students, university students and office workers: a place to unwind with friends after hours of classes, exams or meetings. Every round takes just a few minutes, so it fits into a lunch break, the gap between lectures or the end of a long day.',
    'The games open straight in your browser, on a laptop or a phone. There is nothing to install, no account to create and nothing to pay. Sit next to a friend and take turns on the same screen, or play against the computer on Easy, Medium or Hard when you are on your own.',
    'I build Verdant on my own and add new games over time. If you have an idea, feedback or just want to say hello, my social links are at the bottom of the page.',
  ],
  ctaTitle: 'Interested in working with me?',
  ctaButton: 'Connect now',
  tanoAlt: 'Tano the whale guardian waving hello and holding his lantern staff',
  tags: { '3d': '3D', pvp: '2 players', ai: 'vs Computer', hard: 'Hard', strategy: 'Strategy' },
  cards: {
    'lantern-line': 'Line up 3 in a row on a board floating in a sunset valley. Rotate the scene freely.',
    'ember-and-tide': 'Fire vs Water on a 5×5 board: pieces drop in and stack up to 5 high. Connect 4 in any direction to win.',
    tidepool: "Pearl vs Coral on a hexagonal board in a lagoon. Push lines of marbles and knock 6 of your opponent's into the sea.",
    canopy: 'Amber vs Violet on a 5×5 forest board. Move a climber, grow a tree, cut one back, and light lanterns on 2 treetops to win.',
  } satisfies Record<GameId, string>,

  // ------------------------------------------------------------- Lantern Line
  ttt: {
    subtitle: 'Sunset Valley · each side keeps only 3 pieces',
    helpSubtitle: 'Lantern Line · first to line up 3 wins',
    controls: 'Drag to rotate · Scroll to zoom · Click a square to play · A 4th piece removes your oldest',
    player: (p: Player) => `Player ${p}`,
    draw: 'Draw by threefold repetition! Press “New game” to play again',
    youWin: 'You win!',
    computerWins: 'The computer wins this round!',
    playerWins: (p: Player) => `Player ${p} wins!`,
    yourTurn: 'Your turn (X)',
    thinking: 'Computer is thinking…',
    playerTurn: (p: Player) => `Player ${p}’s turn`,
    cell: (row: number, col: number) => `row ${row}, column ${col}`,
    vanishHint: (p: Player, cell: string) => `The faded ${p} at ${cell} vanishes on this move`,
    square: (cell: string, what: string) => `Square ${cell}: ${what}`,
    aboutToVanish: ', about to vanish',
    empty: 'empty',
  },

  // ------------------------------------------------------------- Ember & Tide
  fw: {
    names: { X: 'Fire', O: 'Water' } satisfies Record<Player, string>,
    subtitle: 'Pieces stack from the bottom up · 4 in a row wins',
    helpSubtitle: 'Ember & Tide · drop pieces, stack them, connect 4',
    controls: 'Click a square to drop a piece · Up to 5 pieces per stack · Drag to rotate · Scroll to zoom',
    draw: 'It’s a draw! Press “New game” to play again',
    youWin: 'You (Fire) win!',
    computerWins: 'The computer (Water) wins this round!',
    sideWins: (name: string) => `${name} wins!`,
    yourTurn: 'Your turn (Fire)',
    thinking: 'Computer (Water) is thinking…',
    sideTurn: (name: string) => `${name}’s turn`,
    column: (row: number, col: number) => `Row ${row}, column ${col}`,
    empty: (cell: string) => `${cell}: empty`,
    stack: (cell: string, height: number, top: string) => `${cell}: stack of ${height}, ${top} on top`,
  },

  // ------------------------------------------------------------- Tidepool
  tp: {
    names: { X: 'Pearl', O: 'Coral' } satisfies Record<Player, string>,
    dirs: ['east', 'north-east', 'north-west', 'west', 'south-west', 'south-east'],
    subtitle: 'Push 6 of your opponent’s marbles into the sea',
    helpSubtitle: 'Tidepool · Pearl vs Coral · first to push off 6 wins',
    controls: 'Click 1–3 of your marbles in a line · Click a gold marker to move · Drag to rotate · Scroll to zoom',
    youWin: (n: number) => `You (Pearl) win! ${n} Coral marbles in the sea`,
    computerWins: 'The computer (Coral) wins this round!',
    sideWins: (name: string, n: number) => `${name} wins! ${n} marbles pushed off`,
    thinking: 'Computer (Coral) is thinking…',
    selected: (name: string, n: number) => `${name}: ${n} selected · click a gold marker`,
    yourTurn: 'Your turn (Pearl)',
    sideTurn: (name: string) => `${name}’s turn`,
    selectHint: 'select 1–3 marbles in a line',
    cell: (row: number, hole: number) => `row ${row}, hole ${hole}`,
    stepSideways: (dir: string) => `Step ${dir} (sideways)`,
    move: (dir: string) => `Move ${dir}`,
    pushed: (n: number, name: string) => `${n} ${name} marble${n > 1 ? 's' : ''}`,
    movePush: (dir: string, pushed: string) => `Move ${dir}, pushing ${pushed}`,
    movePushOff: (dir: string, pushed: string) => `Move ${dir}, pushing ${pushed} — one falls into the sea`,
    marblesGroup: (name: string) => `${name} marbles`,
    marblesKeyboard: 'Marbles (keyboard)',
    movesGroup: 'Moves for the selected marbles',
  },

  // ------------------------------------------------------------- Canopy
  cn: {
    names: { X: 'Amber', O: 'Violet' } satisfies Record<Player, string>,
    stages: ['moss', 'sapling', 'young tree', 'treetop', 'blossom'],
    subtitle: 'Climb, grow, and light lanterns on 2 treetops to win',
    helpSubtitle: 'Canopy · Amber vs Violet · light 2 treetops to win',
    controls: 'Click a climber · Gold marker = move · Green sprout = grow · Coral arrow = cut back · Drag to rotate · Scroll to zoom',
    youWin: 'You (Amber) win!',
    computerWins: 'The computer (Violet) wins!',
    sideWins: (name: string) => `${name} wins!`,
    stuck: (name: string) => `${name} has no move left`,
    twoLit: 'Two treetops lit',
    thinking: 'Computer (Violet) is thinking…',
    grow: (name: string) => `${name}: now grow a tile · click a green sprout`,
    cut: (name: string) => `${name}: cut a tree back one stage, or skip`,
    moveTo: (name: string) => `${name}: click a gold marker to move`,
    yourTurn: 'Your turn (Amber)',
    sideTurn: (name: string) => `${name}’s turn`,
    pickClimber: 'pick a climber',
    skipCut: 'Skip cutting',
    cell: (row: number, col: number) => `row ${row}, column ${col}`,
    growLabel: (cell: string, from: string, to: string) => `Grow ${cell}: ${from} to ${to}`,
    putOut: (name: string) => `, putting out ${name}’s lantern`,
    cutLabel: (cell: string, from: string, to: string, lantern: string) => `Cut ${cell}: ${from} back to ${to}${lantern}`,
    takeLantern: ', taking the lantern',
    lightLantern: ', lighting a lantern',
    stepLabel: (cell: string, stage: string, lantern: string) => `Step to ${cell} (${stage})${lantern}`,
    climbersKeyboard: 'Climbers (keyboard)',
    climbersGroup: (name: string) => `${name} climbers`,
    climberOn: (name: string, cell: string, stage: string) => `${name} climber on ${cell} (${stage})`,
    tilesGrow: 'Tiles to grow',
    tilesCut: 'Tiles to cut back',
    tilesStep: 'Tiles to step onto',
  },
};

export type Dict = typeof en;

const vi: Dict = {
  backToVerdant: 'Về Verdant',
  score: 'Tỉ số',
  noWebGL:
    'Trình duyệt này không hỗ trợ WebGL nên không vẽ được cảnh 3D. Hãy thử bản mới của Chrome, Edge hoặc Firefox — bạn vẫn có thể chơi bằng bàn phím (phím Tab).',
  difficulty: 'Độ khó',
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
  gameMode: 'Chế độ chơi',
  twoPlayers: '2 người',
  vsComputer: 'Đấu máy',
  newGame: 'Ván mới',
  resetScore: 'Xoá tỉ số',
  options: 'Tuỳ chọn',
  draws: 'Hoà',
  you: 'Bạn',
  computer: 'Máy',
  cpu: 'Máy',
  wins: (n) => `Thắng ${n}`,
  loading: 'Đang tải',
  boardKeyboard: 'Bàn cờ (bàn phím)',

  howToPlay: 'Cách chơi',
  close: 'Đóng',
  back: 'Trước',
  next: 'Tiếp',
  gotIt: 'Đã hiểu',
  slideOf: (i, n) => `${i} trên ${n}`,

  settings: 'Cài đặt',
  language: 'Ngôn ngữ',
  sound: 'Âm thanh',
  music: 'Nhạc nền',
  sfx: 'Hiệu ứng',
  muted: 'Tắt',
  audioSoon: 'Nhạc nền và hiệu ứng âm thanh sẽ sớm có. Mức âm lượng bạn chọn được lưu lại để dùng khi ra mắt.',
  done: 'Xong',

  mainNav: 'Điều hướng chính',
  navGames: 'Trò chơi',
  navAbout: 'Giới thiệu',
  playNow: 'Chơi ngay',
  playNamed: (name) => `Chơi ${name}`,
  followMe: 'Theo dõi mình trên',
  socialNav: 'Mạng xã hội',
  legalNav: 'Pháp lý và liên kết trang',
  terms: 'Điều khoản dịch vụ',
  privacy: 'Chính sách quyền riêng tư',
  sitemap: 'Sơ đồ trang',
  home: 'Trang chủ Verdant',

  heroKicker: 'Trò chơi nhẹ nhàng, ngay trên trình duyệt',
  heroTitle: 'Trò chơi kinh điển. Thế giới ngoạn mục.',
  heroLead: 'Không cài đặt, không tài khoản. Mở ra là chơi, cùng bạn bè bên cạnh hoặc đấu với máy.',
  seeAllGames: 'Xem tất cả trò chơi',
  allGames: 'Tất cả trò chơi',
  gamesLive: (n) => `${n} trò chơi · sắp có thêm`,
  badgeNew: 'MỚI',
  play: 'Chơi',
  moreGames: 'Thêm trò chơi',
  comingSoon: 'Sắp ra mắt',
  about: [
    'Verdant là bộ sưu tập nhỏ những trò chơi thư giãn dành cho học sinh, sinh viên và dân văn phòng: một nơi để xả hơi cùng bạn bè sau những giờ học, kỳ thi hay cuộc họp. Mỗi ván chỉ mất vài phút, vừa đủ cho giờ nghỉ trưa, khoảng trống giữa hai tiết học hay cuối một ngày dài.',
    'Các trò chơi mở thẳng trên trình duyệt, trên laptop hay điện thoại. Không cần cài đặt, không cần tạo tài khoản và hoàn toàn miễn phí. Ngồi cạnh một người bạn và thay phiên nhau trên cùng một màn hình, hoặc đấu với máy ở mức Dễ, Vừa hay Khó khi bạn chơi một mình.',
    'Mình tự tay xây dựng Verdant và thêm trò chơi mới theo thời gian. Nếu bạn có ý tưởng, góp ý hay chỉ muốn chào một tiếng, các liên kết mạng xã hội của mình ở cuối trang.',
  ],
  ctaTitle: 'Bạn muốn hợp tác cùng mình?',
  ctaButton: 'Kết nối ngay',
  tanoAlt: 'Tano, chú cá voi hộ vệ, đang vẫy chào và cầm cây gậy đèn lồng',
  tags: { '3d': '3D', pvp: '2 người', ai: 'Đấu máy', hard: 'Khó', strategy: 'Chiến thuật' },
  cards: {
    'lantern-line': 'Xếp 3 quân thẳng hàng trên bàn cờ lơ lửng giữa thung lũng hoàng hôn. Xoay cảnh tuỳ thích.',
    'ember-and-tide': 'Lửa đấu Nước trên bàn 5×5: quân thả xuống và chồng lên đến 5 tầng. Nối 4 theo bất kỳ hướng nào để thắng.',
    tidepool: 'Ngọc trai đấu San hô trên bàn lục giác giữa đầm phá. Đẩy hàng bi và hất 6 viên của đối thủ xuống biển.',
    canopy: 'Hổ phách đấu Tím trên bàn rừng 5×5. Di chuyển người leo, trồng cây, tỉa bớt một cây và thắp đèn trên 2 ngọn cây để thắng.',
  },

  ttt: {
    subtitle: 'Thung lũng hoàng hôn · mỗi bên chỉ giữ 3 quân',
    helpSubtitle: 'Lantern Line · ai xếp được 3 quân trước sẽ thắng',
    controls: 'Kéo để xoay · Cuộn để phóng to · Bấm vào ô để đánh · Quân thứ 4 sẽ xoá quân cũ nhất',
    player: (p) => `Người chơi ${p}`,
    draw: 'Hoà do lặp thế cờ 3 lần! Bấm “Ván mới” để chơi lại',
    youWin: 'Bạn thắng!',
    computerWins: 'Máy thắng ván này!',
    playerWins: (p) => `Người chơi ${p} thắng!`,
    yourTurn: 'Lượt của bạn (X)',
    thinking: 'Máy đang suy nghĩ…',
    playerTurn: (p) => `Lượt của người chơi ${p}`,
    cell: (row, col) => `hàng ${row}, cột ${col}`,
    vanishHint: (p, cell) => `Quân ${p} mờ ở ${cell} sẽ biến mất ở nước này`,
    square: (cell, what) => `Ô ${cell}: ${what}`,
    aboutToVanish: ', sắp biến mất',
    empty: 'trống',
  },

  fw: {
    names: { X: 'Lửa', O: 'Nước' },
    subtitle: 'Quân chồng từ dưới lên · 4 quân thẳng hàng là thắng',
    helpSubtitle: 'Ember & Tide · thả quân, chồng quân, nối 4',
    controls: 'Bấm vào ô để thả quân · Tối đa 5 quân mỗi chồng · Kéo để xoay · Cuộn để phóng to',
    draw: 'Hoà! Bấm “Ván mới” để chơi lại',
    youWin: 'Bạn (Lửa) thắng!',
    computerWins: 'Máy (Nước) thắng ván này!',
    sideWins: (name) => `${name} thắng!`,
    yourTurn: 'Lượt của bạn (Lửa)',
    thinking: 'Máy (Nước) đang suy nghĩ…',
    sideTurn: (name) => `Lượt của ${name}`,
    column: (row, col) => `Hàng ${row}, cột ${col}`,
    empty: (cell) => `${cell}: trống`,
    stack: (cell, height, top) => `${cell}: chồng ${height} quân, trên cùng là ${top}`,
  },

  tp: {
    names: { X: 'Ngọc trai', O: 'San hô' },
    dirs: ['sang đông', 'lên đông bắc', 'lên tây bắc', 'sang tây', 'xuống tây nam', 'xuống đông nam'],
    subtitle: 'Đẩy 6 viên bi của đối thủ xuống biển',
    helpSubtitle: 'Tidepool · Ngọc trai đấu San hô · ai đẩy rơi 6 viên trước sẽ thắng',
    controls: 'Chọn 1–3 viên bi thẳng hàng · Bấm điểm vàng để di chuyển · Kéo để xoay · Cuộn để phóng to',
    youWin: (n) => `Bạn (Ngọc trai) thắng! ${n} viên San hô đã xuống biển`,
    computerWins: 'Máy (San hô) thắng ván này!',
    sideWins: (name, n) => `${name} thắng! Đã đẩy rơi ${n} viên bi`,
    thinking: 'Máy (San hô) đang suy nghĩ…',
    selected: (name, n) => `${name}: đã chọn ${n} viên · bấm một điểm vàng`,
    yourTurn: 'Lượt của bạn (Ngọc trai)',
    sideTurn: (name) => `Lượt của ${name}`,
    selectHint: 'chọn 1–3 viên bi thẳng hàng',
    cell: (row, hole) => `hàng ${row}, lỗ ${hole}`,
    stepSideways: (dir) => `Bước ngang ${dir}`,
    move: (dir) => `Đi ${dir}`,
    pushed: (n, name) => `${n} viên ${name}`,
    movePush: (dir, pushed) => `Đi ${dir}, đẩy ${pushed}`,
    movePushOff: (dir, pushed) => `Đi ${dir}, đẩy ${pushed} — một viên rơi xuống biển`,
    marblesGroup: (name) => `Bi ${name}`,
    marblesKeyboard: 'Bi (bàn phím)',
    movesGroup: 'Các nước đi cho những viên bi đã chọn',
  },

  cn: {
    names: { X: 'Hổ phách', O: 'Tím' },
    stages: ['rêu', 'cây non', 'cây nhỡ', 'ngọn cây', 'hoa nở'],
    subtitle: 'Leo, trồng cây và thắp đèn trên 2 ngọn cây để thắng',
    helpSubtitle: 'Canopy · Hổ phách đấu Tím · thắp sáng 2 ngọn cây để thắng',
    controls: 'Bấm chọn người leo · Điểm vàng = di chuyển · Mầm xanh = trồng · Mũi tên san hô = tỉa · Kéo để xoay · Cuộn để phóng to',
    youWin: 'Bạn (Hổ phách) thắng!',
    computerWins: 'Máy (Tím) thắng!',
    sideWins: (name) => `${name} thắng!`,
    stuck: (name) => `${name} không còn nước đi`,
    twoLit: 'Hai ngọn cây đã sáng đèn',
    thinking: 'Máy (Tím) đang suy nghĩ…',
    grow: (name) => `${name}: giờ hãy trồng một ô · bấm vào mầm xanh`,
    cut: (name) => `${name}: tỉa một cây xuống một bậc, hoặc bỏ qua`,
    moveTo: (name) => `${name}: bấm một điểm vàng để di chuyển`,
    yourTurn: 'Lượt của bạn (Hổ phách)',
    sideTurn: (name) => `Lượt của ${name}`,
    pickClimber: 'chọn một người leo',
    skipCut: 'Bỏ qua tỉa cây',
    cell: (row, col) => `hàng ${row}, cột ${col}`,
    growLabel: (cell, from, to) => `Trồng ${cell}: ${from} thành ${to}`,
    putOut: (name) => `, dập tắt đèn của ${name}`,
    cutLabel: (cell, from, to, lantern) => `Tỉa ${cell}: ${from} về ${to}${lantern}`,
    takeLantern: ', giành lấy đèn',
    lightLantern: ', thắp một ngọn đèn',
    stepLabel: (cell, stage, lantern) => `Bước tới ${cell} (${stage})${lantern}`,
    climbersKeyboard: 'Người leo (bàn phím)',
    climbersGroup: (name) => `Người leo ${name}`,
    climberOn: (name, cell, stage) => `Người leo ${name} ở ${cell} (${stage})`,
    tilesGrow: 'Ô có thể trồng',
    tilesCut: 'Ô có thể tỉa',
    tilesStep: 'Ô có thể bước tới',
  },
};

export const DICTS: Record<Lang, Dict> = { en, vi };

/** Native names, shown the same in every language so players can always find their own. */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', vi: 'Tiếng Việt' };

/** The interface text for the player's chosen language. */
export function useT(): Dict {
  return DICTS[useSettings().lang];
}

/** A bit of text written in each language, for copy that lives next to its own markup (help cards). */
export type Localized = Record<Lang, string>;

/** Renders the right language of a short inline label, e.g. text inside an SVG illustration. */
export function Tr({ en: e, vi: v }: Localized) {
  return useSettings().lang === 'vi' ? v : e;
}
