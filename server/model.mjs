// model.mjs

// Import di crypto per generare salt e derivare l'hash
import crypto from 'node:crypto';

export class Player {
  constructor(username, password, salt, email, monete = 100, games_played = 0) {
    this.username = username;
    this.password = password;
    this.salt = salt;
    this.email = email;
    this.monete = monete;
    this.games_played = games_played;
  }

  static async create(username, email, plainPassword) {
    const salt = crypto.randomBytes(16).toString('hex');

    // deriva l'hash con scrypt (async tramite Promise)
    const password_hash = await new Promise((resolve, reject) => {
      crypto.scrypt(plainPassword, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('hex'));
      });
    });

    // ritorna un'istanza Player (monete 100, games_played 0 di default)
    return new Player(username, password_hash, salt, email, 100, 0);
  }
}

export class Phrase {
  // audience ('logged'|'guest') e guest_seq (numero o null)
  constructor(text, audience = 'logged', guest_seq = null) {
    this.text = text;
    this.audience = audience;
    this.guest_seq = guest_seq;
  }

  static guest(text, seq) {
    return new Phrase(text, 'guest', seq);
  }
}

export class Letter {
  constructor(char, price) {
    this.char = char;
    this.price = price;
  }
}
