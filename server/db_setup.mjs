// db_setup.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Player, Letter, Phrase } from './model.mjs';

const dataBaseName = 'database.sqlite';

export async function openDb() {
  return open({
    filename: dataBaseName,
    driver: sqlite3.Database,
  });
}

let playerList = [];

async function createPlayers() {
  // Utenti per esame
  const user1 = await Player.create('gianluca10', 'gianluca@example.com', 'password1');
  const user2 = await Player.create('mario25', 'mario@example.com', 'password2');
  const user3 = await Player.create('luigi12', 'luigi@example.com', 'password3'); 

  // Altri utenti per prove
  const user4 = await Player.create('francesca02', 'francesca@example.com', 'password4');
  const user5 = await Player.create('lorenzo12', 'lorenzo@example.com', 'password5');
  playerList.push(user1, user2, user3, user4, user5);
}

/* === Frasi === */
const LOGGED_PHRASES = [
  "The dog waits quietly near the small door",
  "A boy runs quickly across the green grass",
  "The cat sleeps softly on the warm pillow",
  "Rain falls gently on the glass window pane",
  "The bus drives slowly down the long street",
  "A girl reads books under the tall old tree",
  "The wind pushes leaves along the wide road",
  "Birds sing loudly in the clear blue sky",
  "The baby smiles while playing with a toy",
  "Snow covers houses in the quiet village",
  "The train stops near the busy little town",
  "A boy eats apples at the wooden table",
  "The teacher writes words on the clean board",
  "Waves crash loudly on the rocky seashore",
  "The farmer feeds cows in the open field",
  "A child draws circles on the white paper",
  "The clock shows seven in the quiet room",
  "A girl sings softly in the small kitchen",
  "People wait calmly at the city bus stop",
  "The lamp shines brightly in the dark hall"
];

// 3 frasi per ospite
const GUEST_PHRASES = [
  "Shadows dance softly across the old bridge",
  "Golden leaves spiral down the quiet lane",
  "A girl drinks water from a small glass cup"
];

// Array finale
const phraseList = [
  ...LOGGED_PHRASES.map(t => new Phrase(t, 'logged', null)),
  ...GUEST_PHRASES.map((t, i) => Phrase.guest(t, i)) 
];

/* === Listino lettere === */
const letterList = [
  new Letter('a', 10), new Letter('b', 4), new Letter('c', 2), new Letter('d', 2),
  new Letter('e', 10), new Letter('f', 3), new Letter('g', 4), new Letter('h', 1),
  new Letter('i', 10), new Letter('j', 5), new Letter('k', 5), new Letter('l', 2),
  new Letter('m', 3), new Letter('n', 1), new Letter('o', 10), new Letter('p', 4),
  new Letter('q', 5), new Letter('r', 2), new Letter('s', 1), new Letter('t', 1),
  new Letter('u', 10), new Letter('v', 4), new Letter('w', 3), new Letter('x', 5),
  new Letter('y', 3), new Letter('z', 5),
];

async function setupDB() {
  console.log('Setting up the database...');
  const db = await openDb();
  await db.exec('PRAGMA foreign_keys = ON;');

  // Ricreo da zero per coerenza
  await db.exec(`
    DROP TABLE IF EXISTS player;
    DROP TABLE IF EXISTS phrase;
    DROP TABLE IF EXISTS letter;

    CREATE TABLE IF NOT EXISTS player (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password      TEXT    NOT NULL,
      salt          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      monete        INTEGER NOT NULL DEFAULT 100,
      games_played  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS phrase (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT NOT NULL,
      audience   TEXT NOT NULL DEFAULT 'logged', -- 'logged' | 'guest'
      guest_seq  INTEGER
    );

    CREATE TABLE IF NOT EXISTS letter (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      char  TEXT    NOT NULL UNIQUE CHECK (length(char) = 1),
      price INTEGER NOT NULL
    );
  `);

  await createPlayers();
  await insertData(db);

  console.log('Database setup completed.');
  await db.close();
}

async function insertData(db) {
  await db.exec('BEGIN');
  try {
    // players
    for (const player of playerList) {
      const { username, password, salt, email, monete = 100, games_played = 0 } = player;
      await db.run(
        'INSERT OR IGNORE INTO player (username, password, salt, email, monete, games_played) VALUES (?, ?, ?, ?, ?, ?)',
        [username, password, salt, email, monete, games_played]
      );
    }

    // phrases
    for (const phrase of phraseList) {
      const { text, audience = 'logged', guest_seq = null } = phrase;
      await db.run(
        'INSERT OR IGNORE INTO phrase (text, audience, guest_seq) VALUES (?, ?, ?)',
        [text, audience, guest_seq]
      );
    }

    // letters
    for (const letter of letterList) {
      const { char, price } = letter;
      await db.run(
        'INSERT OR IGNORE INTO letter (char, price) VALUES (?, ?)',
        [String(char).toLowerCase(), price]
      );
    }

    await db.exec('COMMIT');
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}

setupDB()
  .then(() => console.log('Setup finished successfully.'))
  .catch((err) => {
    console.error('Error during setup:', err);
    process.exitCode = 1;
  });
