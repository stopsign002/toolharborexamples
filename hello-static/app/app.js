// Every fetch below is relative — no leading slash. The browser resolves
// "./_store/note" against the page's own URL, so it keeps working whether
// the portal mounts this tool at /t/hello-static/ or anywhere else. A fetch
// written as "/_store/note" would instead hit the PORTAL's root, not this
// tool — that is the classic path-prefix bug (see TOOL-AUTHORING.md).

const noteEl = document.querySelector('#note');
const storeResult = document.querySelector('#store-result');
const upResult = document.querySelector('#up-result');

async function describe(res) {
  const text = await res.text();
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

document.querySelector('#save').addEventListener('click', async () => {
  storeResult.textContent = 'saving…';
  try {
    const res = await fetch('./_store/note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteEl.value }),
    });
    if (!res.ok) throw new Error(`PUT _store/note -> ${res.status}`);
    storeResult.textContent = 'saved';
  } catch (err) {
    storeResult.textContent = `error: ${err.message}`;
  }
});

document.querySelector('#load').addEventListener('click', async () => {
  storeResult.textContent = 'loading…';
  try {
    const res = await fetch('./_store/note');
    if (res.status === 404) {
      storeResult.textContent = '(nothing saved yet)';
      return;
    }
    if (!res.ok) throw new Error(`GET _store/note -> ${res.status}`);
    const data = await res.json();
    noteEl.value = data.text ?? '';
    storeResult.textContent = 'loaded';
  } catch (err) {
    storeResult.textContent = `error: ${err.message}`;
  }
});

document.querySelector('#up-call').addEventListener('click', async () => {
  upResult.textContent = 'calling…';
  try {
    const res = await fetch('./_up/echo/get?x=1');
    upResult.textContent = await describe(res);
  } catch (err) {
    upResult.textContent = `error: ${err.message}`;
  }
});
