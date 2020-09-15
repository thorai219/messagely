/** User class for message.ly */

const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR, authenticateJWT } = require("../config")

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({username, password, first_name, last_name, phone}){
    try {
      const hashedPwd = await bcrypt.hash(
        password, BCRYPT_WORK_FACTOR
      );
      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
        RETURNING username, password, first_name, last_name, phone;`,
        [username, hashedPwd, first_name, last_name, phone]
      )
      return res.json(result.rows[0]);
    } catch(e) {
      return next(e)
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    try {
      const result = await db.query(
        `SELECT username, password FROM users
        WHERE username = $1`,
        [username]
      );
      const user = result.rows[0];
      return user && await bcrypt.compare(password, user.password);

    } catch(e) {
      return next(e);
    }

  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    try {
      const result = await db.query(
        `UPDATE users SET last_login_at = current_timestamp
        WHERE username = $1
        RETURNING username`,
        [,username]
      );
      if (!result.rows[0]) {
        throw new ExpressError(`${username} not found!`, 404)
      }
      return result.rows[0];
    }catch(e) {
      return next(e);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      const result = await db.query(
        `SELECT username, first_name, last_name, phone
        FROM users ORDER BY username`
      )
      return res.json(result.rows);
    }catch(e) {
      return next(e)
    }
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    try {
      const result = await db.query(
        `SELECT username, first_name, last_name, phone, join_at, last_login_at FROM users
        WHERE username = $1`,
        [username]
      )

      if (!result.rows[0]) {
        throw new ExpressError(`${username} not found!`, 404)
      }
      
      return res.json(result.rows[0]);
    }catch(e) {
      return next(e)
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    try {
      const result = await db.query(
        `SELECT id, to_username, body, sent_at, read_at
        FROM messages
        WHERE from_username = $1`,
        [username]
      );

      const { id, to_username, body, sent_at, read_at } = result.rows[0];

      const toUserResult = await db.query(
        `SELECT username, first_name, last_name, phone
        WHERE username = $1`,
        [to_username]
      )

      return res.json({
        "id": id,
        "to_user": toUserResult.rows[0],
        "body": body,
        "sent_at": sent_at,
        "read_at": read_at
      })
    }catch(e) {
      return next(e);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    try {
      const result = await db.query(
        `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at, u.id, u.first_name, u.last_name, u.phone
        FROM messages AS m
        JOIN users AS u ON m.from_username = u.username
        WHERE to_username = $1`,
        [username]
      );

      return result.rows.map(r => ({
        id: r.id,
        from_user: {
          username: r.from_username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at
      }))
    }catch (e) {
      return next(e);
    }
  }
}


module.exports = User;