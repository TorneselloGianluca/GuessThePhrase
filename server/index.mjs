import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import crypto from 'crypto';
import * as dao from './dao.mjs';
import { body, validationResult } from 'express-validator';

const app = express();


// Configurazioni principali per la logica del gioco
const GAME_DURATION_MS = 60_000;    // durata partita: 60 secondi
const WRONG_MULTIPLIER = 2;         // penalità moltiplicata per lettere sbagliate
const PHRASE_REWARD = 100;          // ricompensa se si indovina la frase
const TIMEOUT_PENALTY = 20;         // monete tolte se scade il tempo
const VOWELS = new Set(['a','e','i','o','u']);  // vocali (limitate per ospiti)


app.use(morgan('dev'));
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/* ================== AUTH (Passport Local) ================== */
// Funzione per hash delle password con scrypt

function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

// Strategia di login locale: controllo username e password

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, async (username, password, done) => {
  try {
    const user = await dao.getPlayerByUsername(username);
    if (!user) return done(null, false, { message: 'Credenziali non valide' });

    const hashedAttempt = await hashPassword(password, user.salt);
    if (hashedAttempt !== user.password) {
      return done(null, false, { message: 'Credenziali non valide' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Gestione utente nella sessione
passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
  try {
    const user = await dao.getPlayerByUsername(username);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

/* ================== ROUTES: LOGIN / ME / LOGOUT ================== */

//login con validazione campi
app.post('/api/login',
  [
    body('username').trim().isLength({ min: 1 }).withMessage('You must provide a username'),
    body('password').trim().isLength({ min: 1 }).withMessage('You must provide a password')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        success: false,
        isValidationError: true,
        errorMsg: errors.array().map(e => e.msg)
      });
    }

    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('passport error:', err);
        return res.json({ success: false, errorMsg: 'Internal server error' });
      }

      if (!user) {
        return res.json({ success: false, errorMsg: info?.message || 'Invalid credentials' });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('req.login error:', err);
          return res.json({ success: false, errorMsg: 'Login failed' });
        }

        req.session.player = { username: user.username, monete: user.monete ?? 0 };

        return res.json({
          success: true,
          user: { username: user.username, monete: user.monete ?? 0 }
        });
      });
    })(req, res, next);
  }
);


//info sessione utente
app.get('/api/me', async (req, res) => {
  const isLogged = !!req.user;
  if (!isLogged) {
    return res.json({ success: true, isLogged: false, user: null });
  }

  try {
    const [freshCoins, gamesPlayed] = await Promise.all([
      dao.getCoins(req.user.username),
      dao.getGamesPlayed(req.user.username)
    ]);

    const user = {
      username: req.user.username,
      monete: Number(freshCoins) || 0,
      gamesPlayed: Number(gamesPlayed) || 0
    };
    req.session.player = { username: user.username, monete: user.monete };

    return res.json({ success: true, isLogged: true, user });
  } catch (e) {
    console.error('GET /me error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//logout e chiusura sessione

app.post('/api/logout', async (req, res) => {
  try {
    await new Promise((resolve) => req.logout(resolve));
  } catch (e) {
    console.error('logout error:', e);
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('session destroy error:', err);
    }
    res.clearCookie('connect.sid', { path: '/' });
    return res.json({ success: true, user: null, isLogged: false });
  });
});

/* ================== HELPERS DI GIOCO ================== */
//funzioni di supporto per la logica del gioco


//costruzione della frase mascherata
//sostituzione delle lettere con "_"
function maskPhrase(text = "", chosenLetters = []) {
  const reLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
  let out = "";
  for (const ch of text) {
    if (!reLetter.test(ch)) {
      out += ch === ' ' ? ' ' : ch;
    } else {
      const lower = ch.toLowerCase();
      out += chosenLetters.includes(lower) ? ch : '_';
    }
  }
  return out;
}

//conta il numero di lettere nella frase
function countLetters(text = "") {
  const match = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g);
  return match ? match.length : 0;
}

function nowMs() { return Date.now(); }

//Controllo tempo della partita
function isExpired(req) {
  const exp = req.session.expiresAt;
  return typeof exp === 'number' && nowMs() > exp;
}

//controllo che esista un player in sessione
//se non esiste lo crea come guest con 0 monete

function ensurePlayerSession(req) {
  if (!req.session.player) req.session.player = { username: 'guest', monete: 0 };
}

//restituisce un oggeto con info di autenticazione/monete da allegare alle risposte API
function packAuth(req) {
  const isLogged = !!req.user;
  const sessPlayer = req.session.player || { username: 'guest', monete: 0 };
  return {
    isLogged,
    player: {
      username: isLogged ? req.user.username : (sessPlayer.username || 'guest'),
      monete: Number(sessPlayer.monete) || 0,
    }
  };
}

//contatore per quanto riguarda l'utente ospite
//in modo che escano le tre frasi sempre nello stesso ordine
//efinite queste tre frasi si chiude la modalità ospite

function ensureGuestProgress(req) {
  if (req.user) return;
  if (typeof req.session.guestIndex !== 'number') req.session.guestIndex = 0;
}

//pulisce completamente la sessione corrente
//quando la partita termina 
function clearGameSession(req) {
  delete req.session.phrase;
  delete req.session.letterList;
  delete req.session.vowelUsed;
  delete req.session.startedAt;
  delete req.session.expiresAt;
}

//normalizza la frase
function normalizeSpaces(str = "") {
  return str.trim().replace(/\s+/g, " ").toLowerCase();
}

/* ================== LISTINO LETTERE ================== */

//restituisce i prezzi delle lettere
app.get('/api/letters', async (req, res) => {
  try {
    let letters = await dao.getAllLetterPrices();
    if (!letters || letters.length === 0) {
      letters = await dao.getAllLetterPrices();
    }
    return res.json({ success: true, letters });
  } catch (e) {
    console.error('letters route error:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/* ================== ROUTES GIOCO  ================== */

// INIT
//inizio di una nuova partita
app.post('/api/game/init', async (req, res) => {
  try {
    ensurePlayerSession(req);
    req.session.vowelUsed = false;
    req.session.letterList = [];
    const start = nowMs();
    req.session.startedAt = start;
    req.session.expiresAt = start + GAME_DURATION_MS;

    let row;
    if (req.user) {
      row = await dao.getRandomPhraseInLengthRange(30, 50);
      if (!row) return res.status(404).json({ success: false, error: 'No phrases in range' });
      const freshCoins = await dao.getCoins(req.user.username);
      req.session.player.monete = Number(freshCoins) || 0;
      if ((Number(freshCoins) || 0) <= 0) {
        clearGameSession(req);
        return res.status(400).json({
          success: false,
          error: 'Monete insufficienti per avviare una partita'
        });
      }
      try { await dao.incrementGamesPlayed(req.user.username); } catch {}
    } else {
      ensureGuestProgress(req);
      const guestRows = await dao.getGuestPhrases();
      const idx = req.session.guestIndex ?? 0;
      if (idx >= guestRows.length) {
        const auth = packAuth(req);
        return res.json({
          success: true,
          ...auth,
          guestExhausted: true,
          gameOver: true,
          summary: { reason: 'guest_exhausted', phrase: null, lettersTried: [], durationSec: 0 },
          canPlayAgain: true
        });
      }
      const pick = guestRows[idx];
      req.session.guestIndex = idx + 1;
      row = { id: pick.id, text: pick.text };
      req.session.player.monete = 0;
    }
    req.session.phrase = row;

    const masked = maskPhrase(row.text, []);
    const numLetters = countLetters(row.text);
    const auth = packAuth(req);

    return res.json({
      success: true,
      ...auth,
      phrase: { id: row.id },
      masked,
      numLetters,
      letterList: [],
      monete: auth.player.monete,
      serverNow: start,
      expiresAt: req.session.expiresAt
    });
  } catch (err) {
    console.error('init route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// LETTER
//logica lettera
app.post('/api/game/letter', async (req, res) => {
  try {
    if (!req.session.phrase) {
      return res.status(400).json({ success: false, error: 'No active game/phrase in session' });
    }
    if (isExpired(req)) {
      const auth = packAuth(req);
      const summary = {
        reason: 'timeout',
        phrase: req.session.phrase.text,
        lettersTried: req.session.letterList || [],
        durationSec: ((nowMs() - (req.session.startedAt || nowMs())) / 1000),
        coinsDelta: auth.isLogged ? -TIMEOUT_PENALTY : undefined
      };
      if (auth.isLogged) {
        try {
          const updated = await dao.increaseCoins(req.user.username, -TIMEOUT_PENALTY);
          req.session.player.monete = Number(updated) || 0;
        } catch {}
      }
      clearGameSession(req);
      return res.json({ success: true, ...auth, gameOver: true, redirectHome: true, summary, monete: auth.player.monete });
    }

    const raw = String(req.body.letter || '').trim();
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(raw)) {
      return res.status(400).json({ success: false, error: 'You must provide a single letter (A-Z)' });
    }
    const letter = raw.toLowerCase();

    if (VOWELS.has(letter)) {
      if (req.session.vowelUsed) {
        return res.json({ success: true, ...packAuth(req), letterList: req.session.letterList || [], masked: maskPhrase(req.session.phrase.text, req.session.letterList || []), numLetters: countLetters(req.session.phrase.text), serverNow: nowMs(), expiresAt: req.session.expiresAt });
      } else {
        req.session.vowelUsed = true;
      }
    }

    if (!Array.isArray(req.session.letterList)) req.session.letterList = [];
    if (req.session.letterList.includes(letter)) {
      return res.json({ success: true, ...packAuth(req), message: 'Lettera già provata.', letterList: req.session.letterList, masked: maskPhrase(req.session.phrase.text, req.session.letterList), numLetters: countLetters(req.session.phrase.text), serverNow: nowMs(), expiresAt: req.session.expiresAt });
    }

    req.session.letterList.push(letter);

    if (req.user) {
      let basePrice = await dao.getLetterPrice(letter);
      if (basePrice == null) {
        return res.status(400).json({ success: false, error: 'Prezzo lettera non trovato' });
      }

      const phraseText = String(req.session.phrase.text || '').toLowerCase();
      const isWrong = !phraseText.includes(letter);
      const cost = basePrice * (isWrong ? WRONG_MULTIPLIER : 1);
      try {
        const currentDbRaw = await dao.getCoins(req.user.username);
        const currentDb = Number(currentDbRaw) || 0;
        const charge = Math.min(cost, currentDb);
        if (charge > 0) {
          const updated = await dao.increaseCoins(req.user.username, -charge);
          req.session.player.monete = Number(updated) || 0;
        } else {
          req.session.player.monete = currentDb;
        }
      } catch {}
    }

    return res.json({ success: true, ...packAuth(req), letter, letterList: req.session.letterList, masked: maskPhrase(req.session.phrase.text, req.session.letterList), numLetters: countLetters(req.session.phrase.text), monete: packAuth(req).player.monete, serverNow: nowMs(), expiresAt: req.session.expiresAt });
  } catch (err) {
    console.error('letter route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PHRASE:
//logica inserimento frase
app.post('/api/game/phrase', async (req, res) => {
  try {
    if (!req.session.phrase) {
      return res.status(400).json({ success: false, error: 'No active game/phrase in session' });
    }

    const guess = String(req.body.text || '').trim();
    if (!guess) return res.status(400).json({ success: false, error: 'You must provide a phrase' });

    const target = String(req.session.phrase.text || '').trim();
    const correct = normalizeSpaces(guess) === target.toLowerCase();

    if (correct) {
      let coinsDelta = 0;
      if (req.user) {
        try {
          const updated = await dao.increaseCoins(req.user.username, PHRASE_REWARD);
          req.session.player.monete = Number(updated) || 0;
          coinsDelta = PHRASE_REWARD;
        } catch {}
      }
      const summary = {
        reason: 'win',
        phrase: target,
        lettersTried: req.session.letterList || [],
        durationSec: ((nowMs() - (req.session.startedAt || nowMs())) / 1000),
        coinsDelta: req.user ? coinsDelta : undefined
      };
      clearGameSession(req);
      return res.json({
        success: true,
        ...packAuth(req),
        correct: true,
        masked: target,
        monete: packAuth(req).player.monete,
        summary,
        gameOver: true
      });
    }


    return res.json({
      success: true,
      ...packAuth(req),
      correct: false,
      masked: maskPhrase(target, req.session.letterList || []),
      serverNow: nowMs(),
      expiresAt: req.session.expiresAt
    });
  } catch (err) {
    console.error('phrase route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ABANDON
//abbandonare la partita
app.post('/api/game/abandon', async (req, res) => {
  try {
    if (!req.session.phrase) {
      return res.status(400).json({ success: false, error: 'No active game/phrase in session' });
    }
    const summary = {
      reason: 'abandon',
      phrase: req.session.phrase.text,
      lettersTried: req.session.letterList || [],
      durationSec: ((nowMs() - (req.session.startedAt || nowMs())) / 1000),
      coinsDelta: 0
    };
    clearGameSession(req);
    return res.json({ success: true, ...packAuth(req), gameOver: true, redirectHome: true, summary, monete: packAuth(req).player.monete });
  } catch (err) {
    console.error('abandon route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// TIMEOUT
//timeout della partita
app.post('/api/game/timeout', async (req, res) => {
  try {
    if (!req.session.phrase) {
      return res.json({ success: true, ...packAuth(req), gameOver: true, redirectHome: true });
    }

    const summary = {
      reason: 'timeout',
      phrase: req.session.phrase.text,
      lettersTried: req.session.letterList || [],
      durationSec: ((nowMs() - (req.session.startedAt || nowMs())) / 1000),
      coinsDelta: packAuth(req).isLogged ? -TIMEOUT_PENALTY : undefined
    };

    clearGameSession(req);
    return res.json({ success: true, ...packAuth(req), gameOver: true, redirectHome: true, summary });
  } catch (err) {
    console.error('timeout route error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


/* ======== 404/500 JSON per /api ======== */
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (req.path && req.path.startsWith('/api')) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  } else {
    next(err);
  }
});

/* ================== BOOTSTRAP SERVER ================== */
const PORT = 3001;
try {
  await dao.initDb();
  app.listen(PORT, () => {
    console.log(`✅ Server avviato su http://localhost:${PORT}`);
  });
} catch (err) {
  console.error('❌ Impossibile inizializzare il DB:', err);
  process.exit(1);
}
