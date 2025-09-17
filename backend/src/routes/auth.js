const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Simple in-memory storage (in production, this would be a proper database)
let users = [];
let sessions = {};

// Initialize with test users for demo purposes
const initializeTestUsers = () => {
  if (users.length === 0) {
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

    console.log('✅ Test users initialized');
  }
};

// Initialize test users on startup
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

// Export for use in other routes
router.authenticateUser = authenticateUser;
router.users = users;
router.sessions = sessions;

module.exports = router;