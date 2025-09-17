const express = require('express');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const router = express.Router();

// Simple in-memory storage (in production, this would be a proper database)
let users = [];
let sessions = {};
let resetTokens = {}; // Format: { token: { userId, email, expiresAt } }

// Initialize with test users for demo purposes (development only)
const initializeTestUsers = () => {
  if (users.length === 0 && process.env.NODE_ENV === 'development') {
    users.push({
      id: 'test-user-1',
      username: 'testuser',
      email: 'test@golf.com',
      password: 'password123',
      handicapIndex: 18.5,
      createdAt: new Date().toISOString(),
      tournaments: []
    });

    users.push({
      id: 'test-user-2',
      username: 'demo',
      email: 'demo@golf.com',
      password: 'demo123',
      handicapIndex: 12.3,
      createdAt: new Date().toISOString(),
      tournaments: []
    });

    console.log('✅ Test users initialized (development mode)');
  } else if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Production mode - no test users created');
  }
};

// Initialize test users on startup (development only)
initializeTestUsers();

// Helper function to generate user ID
const generateUserId = () => crypto.randomBytes(16).toString('hex');

// Helper function to generate session token
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

// Register new user
router.post('/register', (req, res) => {
  try {
    const { username, email, password, handicapIndex } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email or username already exists'
      });
    }

    // Create new user
    const userId = generateUserId();
    const newUser = {
      id: userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password, // In production, this should be hashed
      handicapIndex: parseFloat(handicapIndex) || null,
      createdAt: new Date().toISOString(),
      tournaments: []
    };

    users.push(newUser);

    // Create session
    const sessionToken = generateSessionToken();
    sessions[sessionToken] = {
      userId: userId,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ User registered: ${username} (${email})`);

    // Send welcome email (async, don't wait for it)
    emailService.sendWelcomeEmail(newUser.email, newUser.username)
      .then(() => console.log(`📧 Welcome email sent to ${newUser.email}`))
      .catch(error => console.error(`❌ Failed to send welcome email to ${newUser.email}:`, error.message));

    res.json({
      success: true,
      user: {
        id: userId,
        username: newUser.username,
        email: newUser.email,
        handicapIndex: newUser.handicapIndex
      },
      sessionToken
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Create session
    const sessionToken = generateSessionToken();
    sessions[sessionToken] = {
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ User logged in: ${user.username} (${user.email})`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        handicapIndex: user.handicapIndex
      },
      sessionToken
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current user info
router.get('/me', (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken || !sessions[sessionToken]) {
      return res.status(401).json({
        error: 'Invalid or expired session'
      });
    }

    const session = sessions[sessionToken];
    const user = users.find(u => u.id === session.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        handicapIndex: user.handicapIndex
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (sessionToken && sessions[sessionToken]) {
      delete sessions[sessionToken];
      console.log('✅ User logged out');
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

// Middleware to authenticate requests
const authenticateUser = (req, res, next) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken || !sessions[sessionToken]) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  const session = sessions[sessionToken];
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  req.user = user;
  req.sessionToken = sessionToken;
  next();
};

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Find user by email
    const user = users.find(u => u.email === email.trim().toLowerCase());
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token
    resetTokens[resetToken] = {
      userId: user.id,
      email: user.email,
      expiresAt: expiresAt
    };

    console.log(`🔑 Password reset requested for: ${user.email}`);

    // Send reset email
    const emailResult = await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

    if (emailResult.success) {
      console.log(`📧 Password reset email sent to ${user.email}`);
    } else {
      console.error(`❌ Failed to send reset email to ${user.email}:`, emailResult.error);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      error: 'Failed to process password reset request',
      message: error.message
    });
  }
});

// Reset password endpoint
router.post('/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Reset token and new password are required'
      });
    }

    // Validate reset token
    const resetData = resetTokens[token];
    if (!resetData) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Check if token is expired
    if (new Date() > new Date(resetData.expiresAt)) {
      delete resetTokens[token]; // Clean up expired token
      return res.status(400).json({
        error: 'Reset token has expired. Please request a new password reset.'
      });
    }

    // Find user and update password
    const user = users.find(u => u.id === resetData.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update password (in production, this should be hashed)
    user.password = newPassword;

    // Clean up the used token
    delete resetTokens[token];

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error.message
    });
  }
});

// Export for use in other routes
router.authenticateUser = authenticateUser;
router.users = users;
router.sessions = sessions;

module.exports = router;