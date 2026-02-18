const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('./tokenService');

const register = async (username, email, password) => {
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const user = await User.create(username, email, password);
  return user;
};

const login = async (email, password) => {
  const user = await User.verifyPassword(email, password);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Calculate expiration time for refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create(user.id, refreshToken, expiresAt);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken) => {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new Error('Invalid refresh token');
  }

  const tokenRecord = await RefreshToken.findByToken(refreshToken);
  if (!tokenRecord) {
    throw new Error('Refresh token not found or expired');
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw new Error('User not found');
  }

  const newAccessToken = generateAccessToken(user);
  return {
    accessToken: newAccessToken,
  };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    await RefreshToken.deleteByToken(refreshToken);
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
