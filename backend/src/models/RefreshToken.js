const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const RefreshToken = {
  async create(userId, token, expiresAt) {
    const id = uuidv4();
    const query = `
      INSERT INTO refresh_tokens (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, token, expires_at;
    `;
    const result = await pool.query(query, [id, userId, token, expiresAt]);
    return result.rows[0];
  },

  async findByToken(token) {
    const query = `
      SELECT id, user_id, token, expires_at FROM refresh_tokens 
      WHERE token = $1 AND expires_at > NOW();
    `;
    const result = await pool.query(query, [token]);
    return result.rows[0];
  },

  async deleteByToken(token) {
    const query = 'DELETE FROM refresh_tokens WHERE token = $1;';
    await pool.query(query, [token]);
  },

  async deleteByUserId(userId) {
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1;';
    await pool.query(query, [userId]);
  },
};

module.exports = RefreshToken;
