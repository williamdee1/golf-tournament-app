const express = require('express');
const crypto = require('crypto');
const persistence = require('../services/persistence');

const router = express.Router();

// Initialised empty; populated async by initUsers() at server startup
let users = [];
let sessions = {};

const saveUsers = () => persistence.save('users', users);

const initUsers = async () => {
  const loaded = await persistence.load('users', []);
  // Modify in-place so external references (authRouter.users in tournaments.js) stay valid
  users.length = 0;
  users.push(...loaded);
  initializeTestUsers();
  console.log(`👤 ${users.length} users loaded`);
};

// Initialize with test users for demo purposes
const initializeTestUsers = () => {
  if (users.length === 0) {
    users.push({
      id: 'test-user-1',
      username: 'TestPlayer1',
      password: 'password123',
      handicapIndex: 15.2,
      createdAt: new Date().toISOString(),
      tournaments: []
    });

    users.push({
      id: 'test-user-2',
      username: 'TestPlayer2',
      password: 'password123',
      handicapIndex: 8.5,
      createdAt: new Date().toISOString(),
      tournaments: []
    });

    saveUsers();
    console.log('✅ Test users initialized');
  }
};

// Helper function to generate user ID
const generateUserId = () => crypto.randomBytes(16).toString('hex');

// Helper function to generate session token
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

// Register new user
router.post('/register', (req, res) => {
  try {
    const { username, password, handicapIndex } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Check if username is taken
    const existingUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        error: 'Username already taken'
      });
    }

    const userId = generateUserId();
    const newUser = {
      id: userId,
      username: username.trim(),
      password: password,
      handicapIndex: parseFloat(handicapIndex) || null,
      createdAt: new Date().toISOString(),
      tournaments: []
    };

    users.push(newUser);
    saveUsers();

    const sessionToken = generateSessionToken();
    sessions[sessionToken] = {
      userId: userId,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ User registered: ${username}`);

    res.json({
      success: true,
      user: {
        id: userId,
        username: newUser.username,
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }

    const sessionToken = generateSessionToken();
    sessions[sessionToken] = {
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ User logged in: ${user.username}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
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
router.saveUsers = saveUsers;
router.initUsers = initUsers;

module.exports = router;
