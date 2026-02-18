const Message = require('../models/Message');

const getMessagesBetweenUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.findBetweenUsers(currentUserId, userId);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const getAllMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const messages = await Message.findByUserId(currentUserId);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

module.exports = {
  getMessagesBetweenUsers,
  getAllMessages,
};
