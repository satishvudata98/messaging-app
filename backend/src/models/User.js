const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const bcryptjs = require('bcryptjs');

const User = {
  async create(username, email, password) {
    const id = uuidv4();
    const hashedPassword = await bcryptjs.hash(password, 12);
    const query = `
      INSERT INTO users (id, username, email, password_hash, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, username, email, created_at;
    `;
    const result = await pool.query(query, [id, username, email, hashedPassword]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  async findById(id) {
    const query = 'SELECT id, username, email, created_at FROM users WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT id, username, email, created_at FROM users;';
    const result = await pool.query(query);
    return result.rows;
  },

  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    
    const isValid = await bcryptjs.compare(password, user.password_hash);
    if (!isValid) return null;
    
    return { id: user.id, username: user.username, email: user.email, created_at: user.created_at };
  },
};

module.exports = User;
