const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/', authenticateToken, messageController.getAllMessages);

router.get('/:userId', authenticateToken, messageController.getMessagesBetweenUsers);

module.exports = router;
