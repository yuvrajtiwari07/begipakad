// Responsive check: screenshots the bot game (passing + playing), scoreboard, menu and lobby
// at several viewport sizes via the Chrome DevTools protocol, and prints anything that
// overflows the viewport. No dependencies (uses Node's built-in fetch/WebSocket).
//
// 1. npm run dev                      (app on http://localhost:3000)
// 2. google-chrome --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/bp-chrome about:blank
// 3. node scripts/responsive-check.mjs /tmp/shots 375x667 740x360 1280x720 1920x1080
import fs from 'node:fs';

const [outDir, ...sizes] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

const shot = async (name) => {
  const res = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${outDir}/${name}.png`, Buffer.from(res.result.data, 'base64'));
};

// Report anything that sticks out of the viewport (the bug we're hunting)
const overflowReport = () =>
  evaluate(`(() => {
    const vw = innerWidth, vh = innerHeight, out = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > vw) out.push('page scrollWidth ' + doc.scrollWidth + ' > ' + vw);
    for (const id of ['player-seat-0','player-seat-1','player-seat-2','player-seat-3']) {
      const el = document.getElementById(id); if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > vh + 1 || r.top < -1 || r.right > vw + 1 || r.left < -1) out.push(id + ' outside viewport ' + JSON.stringify([Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]));
    }
    const cards = [...document.querySelectorAll('button[id^="card-"]')];
    const cut = cards.filter(c => { const r = c.getBoundingClientRect(); return r.bottom > vh + 1; });
    if (cut.length) out.push(cut.length + '/' + cards.length + ' hand cards extend below viewport (bottom ' + Math.round(cut[0].getBoundingClientRect().bottom) + ' vs ' + vh + ')');
    const main = document.querySelector('main');
    if (main && main.scrollHeight > main.clientHeight + 2) out.push('table content ' + main.scrollHeight + 'px tall in ' + main.clientHeight + 'px (clipped)');
    return out;
  })()`);

await send('Page.enable');
await send('Runtime.enable');

for (const size of sizes) {
  const [width, height] = size.split('x').map(Number);
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 1024,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: width < 1024 });
  await send('Page.navigate', { url: 'http://localhost:3000/?mode=local' });
  await sleep(3500);
  await shot(`${size}-passing`);
  const passingIssues = await overflowReport();

  // Auto-pass, close the received-cards popup, and wait for a playing state
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Auto-Pass')?.click()`);
  await sleep(2500);
  await evaluate(`(() => { const x = [...document.querySelectorAll('button')].find(b => /continue|got it|close/i.test(b.textContent) || b.textContent.trim() === '✕' || b.getAttribute('aria-label') === 'Close'); x?.click(); })()`);
  await sleep(2500);
  await shot(`${size}-playing`);
  const playingIssues = await overflowReport();

  // Scoreboard drawer (round-wise table) over the game
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.title === 'Scoreboard')?.click()`);
  await sleep(600);
  await shot(`${size}-scoreboard`);
  const scoreIssues = await evaluate(`(() => { const t = document.querySelector('table'); if (!t) return ['no table']; const r = t.closest('.fixed > div')?.getBoundingClientRect(); return r && (r.bottom > innerHeight + 1 || r.right > innerWidth + 1) ? ['scoreboard card exceeds viewport ' + Math.round(r.right) + 'x' + Math.round(r.bottom)] : []; })()`);

  // Main menu
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(2500);
  await shot(`${size}-menu`);
  const menuIssues = await evaluate(`document.documentElement.scrollWidth > innerWidth ? ['menu horizontal overflow ' + document.documentElement.scrollWidth] : []`);

  // Room lobby (creates a room through the PWA shortcut)
  await send('Page.navigate', { url: 'http://localhost:3000/?mode=create' });
  await sleep(3000);
  await shot(`${size}-lobby`);
  const lobbyIssues = await evaluate(`document.documentElement.scrollWidth > innerWidth ? ['lobby horizontal overflow ' + document.documentElement.scrollWidth] : (document.body.innerText.includes('BGP') ? [] : ['lobby not shown'])`);
  await evaluate(`[...document.querySelectorAll('button')].find(b => /leave room/i.test(b.textContent))?.click()`);
  await sleep(500);

  console.log(size, JSON.stringify({ passing: passingIssues, playing: playingIssues, score: scoreIssues, menu: menuIssues, lobby: lobbyIssues }));
}

ws.close();
