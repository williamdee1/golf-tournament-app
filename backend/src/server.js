const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const golfRoutes = require('./routes/golf');
const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');

dotenv.config();

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

app.listen(PORT, () => {
  console.log(`🚀 Golf Tournament Backend running on port ${PORT}`);
  console.log(`📊 BluGolf scraping functionality enabled`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
});