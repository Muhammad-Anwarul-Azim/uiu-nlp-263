// Nudge mode: hand placement on top of the theme, saved as a per-deck stylesheet.
// Press E in the deck. Click an element, drag it, drag the corner to resize, arrow keys
// move 1 px (Shift: 8 px), + and - change its font size, [ and ] its space below,
// Backspace drops its nudges, Z undoes, S downloads cNN.css (drop it over the file beside
// the .qmd; the deck loads it), X clears the browser draft, Esc leaves edit mode.
// A nudge never edits the .qmd: it is one CSS rule keyed to the slide and the element.
// Double-click an element (or press O on the selected one) to open the .qmd in VS Code at the
// line that produced it, as SyncTeX does: the deck fetches its own .qmd from the preview server
// and finds the line whose text matches. PROJECT is this project's absolute path on this Mac.
(function () {
  const PROJECT = '/Users/muhammadanwarulazim/Desktop/DS4213 NLP 263/course/classes';
  const KEY = 'nlp263-nudge:' + location.pathname;
  const deck = (location.pathname.match(/([^/]+)\.html$/) || [, 'deck'])[1];
  let on = false, sel = null, rules = JSON.parse(localStorage.getItem(KEY) || '{}'), undo = [];
  const style = document.createElement('style'); style.id = 'nudge-draft'; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.id = 'nudge-ui'; ui.innerHTML = `
    <style>
      #nudge-ui { position: fixed; top: 0; right: 0; width: 340px; height: 100vh; background: #f4f4f4; color: #222; font: 12px/1.4 Menlo, monospace; z-index: 9999; display: none; flex-direction: column; border-left: 1px solid #bbb; }
      #nudge-ui header { padding: 8px 10px; background: #e2e2e2; font-family: "CMU Sans Serif", sans-serif; font-size: 13px; }
      #nudge-ui .btns { padding: 6px 10px; display: flex; gap: 6px; flex-wrap: wrap; }
      #nudge-ui button { font: 12px "CMU Sans Serif", sans-serif; padding: 3px 8px; border: 1px solid #888; background: #fff; cursor: pointer; }
      #nudge-ui pre { flex: 1; margin: 0; padding: 8px 10px; overflow: auto; white-space: pre-wrap; font-size: 11px; }
      #nudge-ui .help { padding: 6px 10px; color: #555; font-family: "CMU Sans Serif", sans-serif; font-size: 12px; border-top: 1px solid #ccc; }
      #nudge-frame { position: fixed; border: 2px dashed #1f62c8; pointer-events: none; z-index: 9998; display: none; box-sizing: border-box; }
      #nudge-handle { position: fixed; width: 12px; height: 12px; background: #1f62c8; z-index: 9999; cursor: nwse-resize; display: none; }
      html.nudge-on .reveal .slides section * { cursor: move; }
    </style>
    <header>Nudge mode: <b id="nudge-sel">nothing selected</b></header>
    <div class="btns"><button data-a="save">Save ${deck}.css</button><button data-a="undo">Undo</button><button data-a="drop">Drop this one</button><button data-a="clear">Clear draft</button><button data-a="off">Close</button></div>
    <pre id="nudge-css"></pre>
    <div class="help">Click, drag, corner to resize. Arrows 1 px, Shift 8 px. + − size, [ ] space below. Double-click or O: open the .qmd line in VS Code. Z undo, S save, Esc close. Save downloads the file; drop it over <b>${deck}.css</b> beside the .qmd.</div>`;
  document.body.appendChild(ui);
  const frame = document.createElement('div'); frame.id = 'nudge-frame'; document.body.appendChild(frame);
  const handle = document.createElement('div'); handle.id = 'nudge-handle'; document.body.appendChild(handle);
  ui.querySelectorAll('button').forEach(b => b.onclick = () => act(b.dataset.a));

  const PICK = 'h1,h2,h3,p,li,td,th,table,pre,svg,img,.box,.tile,.rows > div,.rows,.bars > div,.bars,.vbars > div,.vbars,.stack,.pbars > div,.pbars,.timeline .lbl,.timeline,.track .tl,.track,.words,.items,.legend,.flow > span,.flow,.band,.type-line,.cols > div';
  function selector(el) {
    const sec = el.closest('section'); if (!sec || !sec.id) return null;
    const path = [];
    for (let e = el; e && e !== sec; e = e.parentElement) {
      const i = Array.from(e.parentElement.children).indexOf(e) + 1;
      path.unshift(`${e.tagName.toLowerCase()}:nth-child(${i})`);
    }
    return `#${sec.id} > ${path.join(' > ')}`;
  }
  function css() {
    return Object.entries(rules).map(([s, r]) => {
      const d = [];
      if (r.dx || r.dy) d.push(`transform: translate(${r.dx || 0}px, ${r.dy || 0}px)`);
      if (r.w) d.push(`width: ${r.w}px`);
      if (r.fs) d.push(`font-size: ${r.fs}px`);
      if (r.mb != null) d.push(`margin-bottom: ${r.mb}px`);
      return d.length ? `${s} { ${d.join('; ')}; }` : '';
    }).filter(Boolean).join('\n');
  }
  function render() {
    style.textContent = css();
    document.getElementById('nudge-css').textContent = css() || '/* no nudges yet */';
    localStorage.setItem(KEY, JSON.stringify(rules));
    place();
  }
  function place() {
    if (!sel || !on) { frame.style.display = handle.style.display = 'none'; return; }
    const b = sel.getBoundingClientRect();
    Object.assign(frame.style, { display: 'block', left: b.left - 3 + 'px', top: b.top - 3 + 'px', width: b.width + 6 + 'px', height: b.height + 6 + 'px' });
    Object.assign(handle.style, { display: 'block', left: b.right - 4 + 'px', top: b.bottom - 4 + 'px' });
  }
  function rule() { const s = selector(sel); if (!s) return null; return rules[s] || (rules[s] = {}); }
  function snapshot() { undo.push(JSON.stringify(rules)); if (undo.length > 100) undo.shift(); }
  function select(el) {
    sel = el; document.getElementById('nudge-sel').textContent = el ? (selector(el) || '(no slide id)').replace(/^#[^ ]+ > /, '') : 'nothing selected'; place();
  }
  function act(a) {
    if (a === 'save') {
      const text = `/* Hand placement for ${deck}, written by nudge mode (theme/nudge.js). Delete a rule to undo it. */\n` + css() + '\n';
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: 'text/css' })); link.download = `${deck}.css`; link.click();
    } else if (a === 'undo') { if (undo.length) { rules = JSON.parse(undo.pop()); render(); } }
    else if (a === 'drop') { if (sel) { snapshot(); delete rules[selector(sel)]; render(); } }
    else if (a === 'clear') { if (confirm('Clear the browser draft of nudges for this deck?')) { snapshot(); rules = {}; render(); } }
    else if (a === 'off') toggle(false);
  }
  function toggle(v) {
    on = v; document.documentElement.classList.toggle('nudge-on', on); ui.style.display = on ? 'flex' : 'none';
    if (!on) select(null); else render();
  }
  // click-to-source
  let qmd = null;
  const norm = t => t.replace(/<[^>]+>/g, ' ').replace(/[\\$*_`{}\[\]:]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  async function openSource(el) {
    const rel = location.pathname.replace(/^\//, '').replace(/\.html$/, '.qmd');
    if (!qmd) { try { qmd = (await (await fetch('/' + rel)).text()).split('\n'); } catch (e) { alert('Could not fetch ' + rel); return; } }
    const sec = el.closest('section'); const title = sec && sec.querySelector('h1,h2,h3');
    // narrow to the slide: find its heading line first, then search from there
    let start = 0;
    if (title) { const t = norm(title.textContent); const i = qmd.findIndex(l => l.startsWith('## ') && norm(l).includes(t.slice(0, 24))); if (i >= 0) start = i; }
    const text = norm(el.textContent), phrase = text.slice(0, 32);
    const words = text.split(' ').filter(w => w.length > 3).slice(0, 8);
    let best = -1, score = 0;
    for (let i = start; i < Math.min(qmd.length, start + 400); i++) {
      if (i > start && qmd[i].startsWith('## ')) break;
      const line = norm(qmd[i]); if (!line) continue;
      if (phrase.length > 8 && line.includes(phrase)) { best = i; break; }
      const hit = words.filter(w => line.includes(w)).length;
      if (hit > score) { score = hit; best = i; }
    }
    if (best < 0) best = start;
    const line = best + 1;
    document.getElementById('nudge-sel').textContent = `${rel}:${line}`;
    // An anchor click hands the vscode:// link to VS Code without navigating this page;
    // window.open(..., '_self') blanked the Quarto Preview pane in VS Code.
    const a = document.createElement('a'); a.href = `vscode://file/${PROJECT}/${rel}:${line}:1`;
    a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
  }
  // mouse: select and drag
  let drag = null;
  document.addEventListener('mousedown', e => {
    if (!on || ui.contains(e.target)) return;
    if (e.target === handle) { drag = { kind: 'resize', x: e.clientX, w: sel.getBoundingClientRect().width / Reveal.getScale() }; snapshot(); e.preventDefault(); return; }
    const el = e.target.closest(PICK); if (!el || !el.closest('.reveal .slides section')) return;
    select(el); const r = rule(); if (!r) return;
    drag = { kind: 'move', x: e.clientX, y: e.clientY, dx: r.dx || 0, dy: r.dy || 0 }; snapshot(); e.preventDefault();
  }, true);
  document.addEventListener('mousemove', e => {
    if (!drag || !sel) return; const k = Reveal.getScale(); const r = rule();
    if (drag.kind === 'move') { r.dx = Math.round(drag.dx + (e.clientX - drag.x) / k); r.dy = Math.round(drag.dy + (e.clientY - drag.y) / k); }
    else { r.w = Math.max(20, Math.round(drag.w + (e.clientX - drag.x) / k)); }
    render();
  });
  document.addEventListener('mouseup', () => { drag = null; });
  document.addEventListener('dblclick', e => { if (!on || ui.contains(e.target)) return; const el = e.target.closest(PICK); if (el && el.closest('.reveal .slides section')) { select(el); openSource(el); e.preventDefault(); } }, true);
  // keys
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'e' && !on) { toggle(true); e.preventDefault(); e.stopPropagation(); return; }
    if (!on) return;
    const step = e.shiftKey ? 8 : 1; const r = sel ? rule() : null;
    const fs = () => r.fs || parseFloat(getComputedStyle(sel).fontSize);
    const mb = () => r.mb != null ? r.mb : parseFloat(getComputedStyle(sel).marginBottom);
    let handled = true;
    if (e.key === 'Escape') toggle(false);
    else if (e.key === 'z' || e.key === 'Z') act('undo');
    else if (e.key === 's' || e.key === 'S') act('save');
    else if (e.key === 'x' || e.key === 'X') act('clear');
    else if ((e.key === 'o' || e.key === 'O') && sel) openSource(sel);
    else if (!r) handled = false;
    else if (e.key === 'ArrowLeft') { snapshot(); r.dx = (r.dx || 0) - step; }
    else if (e.key === 'ArrowRight') { snapshot(); r.dx = (r.dx || 0) + step; }
    else if (e.key === 'ArrowUp') { snapshot(); r.dy = (r.dy || 0) - step; }
    else if (e.key === 'ArrowDown') { snapshot(); r.dy = (r.dy || 0) + step; }
    else if (e.key === '+' || e.key === '=') { snapshot(); r.fs = Math.round(fs() + step); }
    else if (e.key === '-' || e.key === '_') { snapshot(); r.fs = Math.max(8, Math.round(fs() - step)); }
    else if (e.key === ']') { snapshot(); r.mb = Math.round(mb() + step); }
    else if (e.key === '[') { snapshot(); r.mb = Math.max(0, Math.round(mb() - step)); }
    else if (e.key === 'Backspace' || e.key === 'Delete') act('drop');
    else handled = false;
    if (handled) { e.preventDefault(); e.stopPropagation(); render(); }
  }, true);
  Reveal.on('slidechanged', () => select(null));
  Reveal.on('fragmentshown', place); Reveal.on('fragmenthidden', place);
  window.addEventListener('resize', place);
  render();
})();
