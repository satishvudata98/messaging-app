const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  validateRegistration,
  validateLogin,
  handleValidationErrors,
} = require('../middleware/validation');

router.post(
  '/register',
  validateRegistration,
  handleValidationErrors,
  authController.register
);

router.post('/login', validateLogin, handleValidationErrors, authController.login);

router.post('/logout', authController.logout);

router.post('/refresh', authController.refresh);

module.exports = router;
