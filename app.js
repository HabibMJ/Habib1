/* ---------------- Progress (persisted in localStorage) ---------------- */
const STORAGE_KEY = 'learnpy_progress';

function getProgress(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  }catch(e){ return {}; }
}
function setLessonComplete(slug){
  const p = getProgress();
  p[slug] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  refreshSidebarProgress();
}
function refreshSidebarProgress(){
  const p = getProgress();
  const items = document.querySelectorAll('.lesson-nav li[data-slug]');
  let done = 0;
  items.forEach(li => {
    const slug = li.getAttribute('data-slug');
    if (p[slug]){
      li.classList.add('done');
      const num = li.querySelector('.lesson-num');
      if (num) num.textContent = '✓';
      done++;
    }
  });
  const total = items.length;
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (fill) fill.style.width = total ? `${(done/total)*100}%` : '0%';
  if (text) text.textContent = `${done} / ${total}`;

  // also refresh index tiles if present
  document.querySelectorAll('.lesson-tile[data-slug]').forEach(tile => {
    const slug = tile.getAttribute('data-slug');
    if (p[slug] && !tile.querySelector('.tile-check')){
      const check = document.createElement('span');
      check.className = 'tile-check';
      check.textContent = '✓';
      tile.querySelector('.tile-num').appendChild(check);
    }
  });
}
document.addEventListener('DOMContentLoaded', refreshSidebarProgress);

/* ---------------- Hero typing animation (index page) ---------------- */
function typeHero(el, text, delay){
  let i = 0;
  (function step(){
    if (i <= text.length){
      el.textContent = text.slice(0, i);
      i++;
      setTimeout(step, delay || 55);
    }
  })();
}
const heroTyped = document.getElementById('heroTyped');
if (heroTyped){
  typeHero(heroTyped, ' print("hello, world")', 55);
}

/* ---------------- Pyodide boot ---------------- */
let pyodideReady = false;
let pyodide = null;

async function bootPyodide(){
  const loadingBadge = document.getElementById('loadingBadge');
  const loadingText = document.getElementById('loadingText');
  const runBtn = document.getElementById('runBtn');
  const runStatus = document.getElementById('runStatus');
  try{
    pyodide = await loadPyodide();
    pyodideReady = true;
    if (loadingText) loadingText.textContent = 'Ready';
    if (loadingBadge) setTimeout(() => { loadingBadge.style.display = 'none'; }, 900);
    if (runBtn) runBtn.disabled = false;
    if (runStatus) runStatus.textContent = 'Ready';
  }catch(e){
    if (loadingText) loadingText.textContent = 'Could not load Python engine';
    console.error(e);
  }
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function runCode(slug){
  const codeInput = document.getElementById('codeInput');
  const out = document.getElementById('consoleOut');
  const btn = document.getElementById('runBtn');
  if (!pyodideReady || !codeInput) return;
  const code = codeInput.value;
  btn.disabled = true;
  btn.textContent = 'Running…';
  out.innerHTML = '';
  try{
    pyodide.setStdout({ batched: (s) => { out.textContent += s + "\n"; } });
    pyodide.setStderr({ batched: (s) => { out.innerHTML += `<span class="err">${escapeHtml(s)}</span>\n`; } });
    await pyodide.runPythonAsync(code);
    if (!out.textContent.trim() && !out.innerHTML.includes('err')){
      out.innerHTML = '<span class="placeholder">(no output — try adding a print statement)</span>';
    }
    if (slug) setLessonComplete(slug);
  }catch(e){
    out.innerHTML = `<span class="err">${escapeHtml(e.message || String(e))}</span>`;
  }finally{
    btn.disabled = false;
    btn.textContent = 'Run ▸';
  }
}

function resetCode(starter){
  const codeInput = document.getElementById('codeInput');
  const out = document.getElementById('consoleOut');
  if (codeInput) codeInput.value = starter;
  if (out) out.innerHTML = '<span class="placeholder">Output will appear here.</span>';
}

/* ---------------- Quiz ---------------- */
function checkQuiz(qIndex, chosenIndex, correctIndex){
  const q = document.getElementById(`quiz-${qIndex}`);
  if (!q) return;
  const opts = q.querySelectorAll('.quiz-opt');
  opts.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correctIndex) btn.classList.add('correct');
    else if (i === chosenIndex) btn.classList.add('incorrect');
  });
  const feedback = q.querySelector('.quiz-feedback');
  if (feedback){
    feedback.textContent = chosenIndex === correctIndex
      ? 'Correct!'
      : 'Not quite — the correct answer is highlighted above.';
  }
}

/* boot pyodide only on pages that have an editor */
if (document.getElementById('codeInput')){
  bootPyodide();
}
