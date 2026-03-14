const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Fix for Railway deployment - polyfill missing Web APIs
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(data, name, options = {}) {
      this.data = data;
      this.name = name;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

dotenv.config();

const persistence = require('./services/persistence');
const golfRoutes = require('./routes/golf');
const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/golf', golfRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Golf Tournament Backend API is running!',
    timestamp: new Date().toISOString(),
    bluegolf_scraping: 'enabled'
  });
});

async function startServer() {
  try {
    await persistence.initialize();
    await authRoutes.initUsers();
    await tournamentRoutes.initTournaments();

    app.listen(PORT, () => {
      console.log(`🚀 Golf Tournament Backend running on port ${PORT}`);
      console.log(`📊 BluGolf scraping functionality enabled`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
