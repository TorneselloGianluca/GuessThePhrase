const API_BASE = 'http://localhost:3001';


function parseJsonSafe(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return res.text().then(text => {
      const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(
        `Risposta non-JSON da ${res.url} (status ${res.status}). Primo chunk: "${snippet}"`
      );
    });
  }
  return res.json();
}

/* ================== GIOCO ================== */

// Avvia nuova partita
export async function gameInit() {
  const r = await fetch(`${API_BASE}/api/game/init`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Game init failed');
  return data;
}

// Giocata lettera
export async function gameLetter(letter) {
  const r = await fetch(`${API_BASE}/api/game/letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ letter })
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Game letter failed');
  return data;
}

// Giocata frase
export async function gamePhrase(text) {
  const r = await fetch(`${API_BASE}/api/game/phrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ text })
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Game phrase failed');
  return data;
}

// Abbandona
export async function gameAbandon() {
  const r = await fetch(`${API_BASE}/api/game/abandon`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Game abandon failed');
  return data;
}

// Timeout
export async function gameTimeout() {
  const r = await fetch(`${API_BASE}/api/game/timeout`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Game timeout failed');
  return data;
}

/* ================== SESSIONE ================== */
export async function getSession() {
  const r = await fetch(`${API_BASE}/api/me`, {
    method: 'GET',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Session check failed');
  return { isLogged: !!data.isLogged, user: data.user ?? null };
}

/* ================== LOGIN ================== */
export async function loginHandler(username, password) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await parseJsonSafe(response);

  if (!data.success) {
    if (data.isValidationError && Array.isArray(data.errorMsg)) {
      throw data.errorMsg;
    }
    throw new Error(data.errorMsg || 'Login failed');
  }

  return data.user; // { username, monete }
}

/* ================== LOGOUT ================== */
export async function logoutHandler() {
  const r = await fetch(`${API_BASE}/api/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Logout failed');
  return data;
}

/* ================== LETTERE ================== */
export async function getLetterPrices() {
  const r = await fetch(`${API_BASE}/api/letters`, {
    method: 'GET',
    credentials: 'include'
  });
  const data = await parseJsonSafe(r);
  if (!r.ok || data?.success !== true)
    throw new Error(data?.error || 'Cannot fetch letter prices');
  return data.letters || [];
}
