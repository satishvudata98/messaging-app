const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const user = await authService.register(username, email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.login(email, password);

    // Set refresh token as http-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user,
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    await authService.logout(refreshToken);

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const { accessToken } = await authService.refreshAccessToken(refreshToken);

    res.json({
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error.message);
    res.status(401).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
};
