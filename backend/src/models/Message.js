const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

const Message = {
  async create(senderId, receiverId, content) {
    const id = uuidv4();
    const query = `
      INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, sender_id, receiver_id, content, created_at;
    `;
    const result = await pool.query(query, [id, senderId, receiverId, content]);
    return result.rows[0];
  },

  async findBetweenUsers(userId1, userId2, limit = 50) {
    const query = `
      SELECT id, sender_id, receiver_id, content, created_at
      FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at DESC
      LIMIT $3;
    `;
    const result = await pool.query(query, [userId1, userId2, limit]);
    return result.rows.reverse();
  },

  async findByUserId(userId, limit = 100) {
    const query = `
      SELECT id, sender_id, receiver_id, content, created_at
      FROM messages
      WHERE sender_id = $1 OR receiver_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  },
};

module.exports = Message;
