const pool = require('./db');

const initializeDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
      ON messages(sender_id, receiver_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
      ON refresh_tokens(user_id);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
};

module.exports = initializeDatabase;
