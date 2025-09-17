# Golf Tournament Backend

Backend API server for the Golf Tournament App with BluGolf web scraping capabilities.

## Features

- **BluGolf Scraping**: Automated scraping of golf course data from BluGolf.com
- **Google Search Integration**: Finds BluGolf course pages via Google search
- **Fallback API**: Uses golfcourseapi.com as backup when BluGolf scraping fails
- **RESTful API**: Clean endpoints for course search and details

## Installation

```bash
cd backend
npm install
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Test Connection
```
GET /api/test
GET /api/golf/test
```

### Search Courses
```
GET /api/golf/search?q=course_name&limit=5
```

### Get Course Details
```
GET /api/golf/courses/:courseId
```

### Manual Scraping
```
POST /api/golf/scrape
Content-Type: application/json

{
  "courseName": "La Cala Campo Europa"
}
```

### Nearby Courses (fallback API only)
```
GET /api/golf/nearby?lat=36.5&lng=-4.9&radius=25&limit=20
```

## How BluGolf Scraping Works

1. **Google Search**: Searches for "course_name golf course bluegolf site:bluegolf.com"
2. **URL Extraction**: Finds BluGolf course page URLs from search results
3. **Page Scraping**: Uses Puppeteer to load and parse course scorecard data
4. **Data Processing**: Extracts hole information, par, yardages, and tee data

## Environment Variables

```env
PORT=3001
GOLF_COURSE_API_KEY=your_api_key
PUPPETEER_HEADLESS=true
SCRAPING_TIMEOUT=30000
```

## Data Format

Scraped course data includes:
- Course name and location
- Hole-by-hole information (number, par, handicap, yardages)
- Tee information (name, color, rating, slope)
- Total par and yardages by tee