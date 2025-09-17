# Golf Tournament App

## Project Overview
A mobile golf tournament app for friends to compete in multi-course tournaments, available on Google Play and Apple App Store.

## Core Features

### Tournament Management
- Create new tournaments with multiple golf courses
- Course data sourced from golfcourseapi.com API
- Share tournament events with other users
- Host can define which courses and tees are used

### Course Integration
- **Primary Method**: BluGolf Web Scraping (due to limited coverage in golfcourseapi.com)
- **Workflow**:
  1. Search for golf course in Google
  2. Navigate to BluGolf result page
  3. Scrape scorecard information from BluGolf course pages
  4. Example: La Cala Campo Europa → https://course.bluegolf.com/bluegolf/course/course/lacalagreurpoa/detailedscorecard.htm
- **Fallback API**: golfcourseapi.com (API Key: [REDACTED - use environment variable])
- **Note**: Small-scale implementation planned due to manual nature of BluGolf scraping

### User Management
- User authentication and login
- Join tournaments via shared links/codes
- Handicap index entry for new competitors
- Automatic handicap calculation per course/tee

### Scoring System
- Real-time score entry during rounds
- Live leaderboard updates
- Course-specific handicap adjustments
- Tournament-wide scoring and averages
- Visible to all logged-in participants

## Technical Requirements
- Cross-platform mobile development
- Real-time data synchronization
- Integration with golfcourseapi.com
- User authentication system
- Offline score entry capability
- App store deployment ready

## Latest Updates (Session Tracking)

### ✅ Completed Features (2025-09-15)
- **Complete Tournament Management System**:
  - User authentication and registration with session tokens
  - Tournament creation, joining, deletion with ID-based sharing
  - Course management within tournaments with tee selection
  - Real-time player leaderboard with multi-column scoring display

- **Advanced Scoring System**:
  - Real-time score entry with auto-save per hole
  - Course handicap management with persistent storage
  - Full Stableford points calculation (0-6 point scale with proper handicap allocation)
  - Score-to-par calculations for individual players and tournament totals

- **Professional Scorecard UI**:
  - Horizontal hole-by-hole layout (Front 9 + Back 9)
  - Color-coded score cells: Eagle/Better (Purple), Birdie (Red), Par (White), Bogey (Blue), Double Bogey+ (Dark Blue)
  - Mobile-optimized input controls with touch-friendly interface
  - Read-only mode for viewing other players' scorecards

- **Interactive Player Leaderboard**:
  - Clickable player scores linking to individual scorecards
  - Multi-column display: Course scores, Birdies, Stableford Points, Score-to-Par
  - Real-time updates as players enter scores
  - Course-specific performance tracking

- **Backend Infrastructure**:
  - Node.js/Express server with BluGolf scraping capabilities
  - Tournament data persistence with in-memory storage
  - Authentication middleware and session management
  - Course handicap and scoring API endpoints

- **Mobile Deployment Preparation**:
  - Railway deployment configuration with CLI setup
  - Environment-based API configuration (dev/prod)
  - Expo development build configuration
  - Production deployment scripts and configuration files

### 🔧 Current Technical Setup
- **Backend Server**: `http://localhost:3001` (Node.js + Express + Puppeteer + Cheerio)
- **Frontend App**: `http://localhost:8082` (React Native Expo web)
- **Search Strategy**:
  1. **Primary**: BluGolf Directory Search (`https://course.bluegolf.com/bluegolf/course/course/directory.htm`)
  2. **Fallback**: Google Search for BluGolf pages (with CAPTCHA bypass)
  3. **Final Fallback**: Direct URL construction
- **API Structure**:
  - `GET /api/golf/search-options?q=course_name` - Multi-result BluGolf directory search
  - `GET /api/golf/search?q=course_name` - Single course search with all fallbacks
  - `GET /api/golf/courses/:id` - Get detailed course information with enhanced scraping
  - `POST /api/golf/scrape` - Manual BluGolf URL scraping
  - `GET /api/golf/nearby` - Nearby courses (fallback API only)

### 📁 File Structure
```
├── CLAUDE.md (this file)
├── backend/
│   ├── package.json
│   ├── .env
│   ├── README.md
│   └── src/
│       ├── server.js
│       ├── routes/golf.js
│       └── services/
│           ├── googleSearch.js
│           ├── bluegolfScraper.js
│           └── golfCourseApi.js
└── golf-tournament-app/
    └── src/
        ├── screens/HomeScreen.tsx (updated with search test)
        ├── services/golfCourseApi.ts
        └── [other app files]
```

### ⚠️ Known Issues
- **Delete Buttons Still Not Working**: Despite implementing multiple fixes (absolute positioning, separate containers, hit slop), delete buttons remain non-functional in web environment
  - Attempted fixes: Absolute positioning, styled like working tee buttons, separate wrapper containers
  - Both course delete buttons (TournamentDetail.tsx) and tournament delete buttons (HomeScreen.tsx) affected
  - Console logging shows button press events are not firing
- **BluGolf Directory Search**: Form interaction intermittently fails with "Node not clickable" errors
  - Enhanced with `page.evaluate()` approach and multiple fallback methods
  - Extensive debugging added to diagnose form structure
- **Google Search**: Frequently blocked by CAPTCHA detection
  - Now has bypass mechanisms and is used as fallback only
- **golfcourseapi.com**: Fallback API returning 401 errors (key may be invalid)
- **Railway Backend Deployment**: Current deployment failed to build - needs diagnosis

### ✅ Completed Features (2025-09-16)
- **Railway Backend Deployment**: Successfully deployed backend server to Railway cloud platform
  - Project URL: https://railway.com/project/e0f6d992-cfa7-448a-a2b6-9b6c66b1a7fc
  - Fixed Windows path deployment issues (removed problematic 'nul' file)
  - Backend now live and accessible for mobile app integration

### 🎯 Next Priorities (Session Handoff)
1. **Update API Configuration**: Replace Railway URL placeholder in `golf-tournament-app/src/config/api.ts` with actual deployment URL
2. **Mobile App Deployment**: Build app with `eas build --platform android --profile development`
3. **Mobile Testing**: Install and test complete app functionality on mobile device
4. **Production Optimization**: Implement data caching and performance improvements

### 📋 Session Status
- **Backend**: Railway deployment completed successfully
- **Frontend**: Development server ready for mobile deployment
- **Next Step**: Update API endpoints with Railway URL and build mobile app

---

## Development Instructions

### 📝 CLAUDE.md Maintenance
**IMPORTANT**: Always update this section when making significant changes:

1. **After completing major features**: Add to "Completed Features" with date
2. **When fixing bugs**: Update "Known Issues" section
3. **Before ending sessions**: Update "Current Technical Setup" and "Next Priorities"
4. **When starting new sessions**: Review this section first to understand current state

### 🚀 Development Commands
```bash
# Start backend server
cd backend && node src/server.js

# Start frontend (web)
cd golf-tournament-app && npx expo start --port 8082 --web

# Test backend API
curl http://localhost:3001/api/test
curl "http://localhost:3001/api/golf/search?q=course_name"
```

### 🔚 Session Management
**End Session Command**: Simply type `END SESSION` and I will:
1. **Update CLAUDE.md** with current development progress
2. **Kill all running servers** (backend, frontend, any background processes)
3. **Document any temporary states** or debugging configurations
4. **List immediate next steps** for the following session
5. **Clean up background processes** to ensure a clean environment

This ensures proper session handoff and prevents resource conflicts between development sessions.

### 🔄 Session Handoff Protocol
When ending a development session:
1. Update this "Latest Updates" section
2. Document any running processes/servers
3. Note any temporary workarounds or debugging states
4. List immediate next steps for continuation

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

ALWAYS update the "Latest Updates" section in CLAUDE.md when making significant changes to track development progress across sessions.