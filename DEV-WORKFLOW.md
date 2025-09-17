# Golf Tournament App - Development Workflow

## 🚀 Quick Start

### Development Environment
1. **Start Development Servers**
   ```bash
   # Windows: Double-click this file
   start-dev.bat

   # Or manually:
   # Terminal 1: Backend
   cd backend && node src/server.js

   # Terminal 2: Frontend
   cd golf-tournament-app && npx expo start --web --port 8087
   ```

2. **Stop Development Servers**
   ```bash
   # Windows: Double-click this file
   stop-dev.bat

   # Or manually: Ctrl+C in each terminal
   ```

3. **Access Applications**
   - 🌐 **Web App**: http://localhost:8087
   - 📊 **Backend API**: http://localhost:3001/api
   - 🧪 **API Test**: http://localhost:3001/api/test

## 🔧 Environment Configuration

### Local Development
- **Frontend**: React Native Web on port 8087
- **Backend**: Node.js Express on port 3001
- **Features**: URL scraping with local Chrome browser

### Production (Railway)
- **Frontend**: To be deployed to web hosting
- **Backend**: [RAILWAY_URL - see environment variables]
- **Features**: Full URL scraping with puppeteer-core

## 📁 Project Structure

```
Golf_App/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── server.js       # Main server file
│   │   ├── routes/golf.js  # Golf course API endpoints
│   │   └── services/       # External service integrations
│   ├── package.json
│   └── .env                # Environment variables
├── golf-tournament-app/     # React Native Web frontend
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── components/     # Reusable components
│   │   ├── config/api.ts   # API configuration
│   │   └── services/       # API service calls
│   └── package.json
├── start-dev.bat           # Start development environment
├── stop-dev.bat            # Stop development environment
└── CLAUDE.md               # Project documentation
```

## 🛠️ Development Commands

### Backend Commands
```bash
cd backend
npm install                 # Install dependencies
node src/server.js         # Start development server
npm test                   # Run tests (if available)
```

### Frontend Commands
```bash
cd golf-tournament-app
npm install                # Install dependencies
npx expo start --web      # Start web development server
npx expo start --web --port 8087  # Start on specific port
npm run build             # Build for production
```

### Testing URL Scraping
```bash
# Test local backend API
curl -X POST http://localhost:3001/api/golf/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://algarvegolf.net/espichegolf/scorecard.htm"}'

# Test Railway production API
curl -X POST [RAILWAY_URL]/api/golf/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://algarvegolf.net/espichegolf/scorecard.htm"}'
```

## 🔄 Deployment Workflow

### Backend (Railway)
1. Make changes to backend code
2. Commit and push to repository
3. Railway auto-deploys from main branch
4. Verify deployment at Railway dashboard

### Frontend (Web Hosting)
1. Update production API URL in `src/config/api.ts` if needed
2. Build production bundle: `npm run build`
3. Deploy built files to web hosting platform
4. Test production deployment

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill all Node.js processes
taskkill /f /im node.exe

# Or use stop-dev.bat script
```

**API Connection Issues**
- Check backend server is running on port 3001
- Verify API_BASE_URL in frontend config
- Test API endpoints with curl commands above

**URL Scraping Fails**
- Ensure Chrome browser is installed
- Check puppeteer-core dependency is installed
- Verify target website allows scraping

**Metro Bundler Issues**
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro cache
npx expo start --web --reset-cache
```

## 📋 Next Development Tasks

### High Priority
- [ ] Fix delete button functionality
- [ ] Add comprehensive error handling
- [ ] Implement proper loading states
- [ ] Add input validation

### Medium Priority
- [ ] Mobile responsive design
- [ ] Offline data persistence
- [ ] Real-time leaderboard updates
- [ ] Export functionality (PDF, CSV)

### Low Priority
- [ ] Advanced tournament formats
- [ ] Player statistics tracking
- [ ] Course database caching
- [ ] Team competition features

## 🔚 Session Management

### Starting a Session
1. Run `start-dev.bat` to launch development environment
2. Open browser to http://localhost:8087
3. Begin development work

### Ending a Session
1. Save all changes
2. Run `stop-dev.bat` to stop all servers
3. Update DEV-WORKFLOW.md with progress
4. Update CLAUDE.md with session notes