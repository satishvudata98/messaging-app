const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/', authenticateToken, userController.getAllUsers);

router.get('/:id', authenticateToken, userController.getUserById);

module.exports = router;
