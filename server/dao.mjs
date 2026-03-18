import sqlite3 from 'sqlite3';

const DB_NAME = 'database.sqlite';
let db = null;

// =================== BOOT/SHUTDOWN DB ===================
export const initDb = () => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    db = new sqlite3.Database(DB_NAME, (err) => {
      if (err) {
        console.error('Error while opening the database:', err.message);
        return reject(err);
      }
      console.log('Connected to DB:', DB_NAME);
      resolve(db);
    });
  });
};

export const closeDb = () => {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    db.close((err) => {
      if (err) {
        console.error('Error while closing the database:', err.message);
        return reject(err);
      }
      console.log('Database connection closed.');
      db = null;
      resolve();
    });
  });
};

// =================== PLAYERS ===================
export const getPlayerByUsername = (username) => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM player WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) {
        console.error('Error fetching player by username:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
};

export function getCoins(username) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT monete FROM player WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) return reject(err);
      resolve(row?.monete ?? 0);
    });
  });
}

export function increaseCoins(username, delta) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE player
      SET monete = MAX((SELECT monete FROM player WHERE username = ?) + ?, 0)
      WHERE username = ?`;
    db.run(sql, [username, delta, username], function (err) {
      if (err) {
        console.error('increaseCoins error:', err.message);
        return reject(err);
      }
      db.get('SELECT monete FROM player WHERE username = ?', [username], (e, row) => {
        if (e) return reject(e);
        resolve(row?.monete ?? 0);
      });
    });
  });
}

// === games_played ===
export function getGamesPlayed(username) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT games_played FROM player WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) return reject(err);
      resolve(row?.games_played ?? 0);
    });
  });
}

export function incrementGamesPlayed(username) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE player
      SET games_played = COALESCE((SELECT games_played FROM player WHERE username = ?), 0) + 1
      WHERE username = ?`;
    db.run(sql, [username, username], function (err) {
      if (err) {
        console.error('incrementGamesPlayed error:', err.message);
        return reject(err);
      }
      db.get('SELECT games_played FROM player WHERE username = ?', [username], (e, row) => {
        if (e) return reject(e);
        resolve(row?.games_played ?? 0);
      });
    });
  });
}

// =================== PHRASES ===================
// Frasi per utenti loggati, filtrate per lunghezza
export function getRandomPhraseInLengthRange(minLetters, maxLetters) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, text
      FROM phrase
      WHERE audience='logged'
        AND length(replace(text,' ','')) BETWEEN ? AND ?
      ORDER BY RANDOM() LIMIT 1`;
    db.get(sql, [minLetters, maxLetters], (err, row) => {
      if (err) {
        console.error('Error fetching ranged phrase:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
}

// Frasi per ospite
export function getGuestPhrases() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, text
      FROM phrase
      WHERE audience='guest'
      ORDER BY guest_seq ASC, id ASC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching guest phrases:', err.message);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

// Parametrica: frase per id
export function getPhraseById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, text, audience, guest_seq FROM phrase WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// =================== LETTERS ===================
export function getLetterPrice(char) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT price FROM letter WHERE char = ?';
    db.get(sql, [String(char).toLowerCase()], (err, row) => {
      if (err) {
        console.error('Error fetching letter price:', err.message);
        return reject(err);
      }
      resolve(row ? row.price : null);
    });
  });
}

export function getAllLetterPrices() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT char, price FROM letter ORDER BY char ASC';
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching letter prices:', err.message);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}



// =================== LEADERBOARD ===================
export function getTopPlayers(limit = 10) {
  return new Promise((resolve, reject) => {
    const safe = Math.max(1, Math.min(Number(limit) || 10, 100));
    const sql = `
      SELECT username, monete, games_played
      FROM player
      ORDER BY monete DESC, games_played DESC, username ASC
      LIMIT ?`;
    db.all(sql, [safe], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}
