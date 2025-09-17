const express = require('express');
const golfCourseApi = require('../services/golfCourseApi');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    message: 'Golf API endpoints working!',
    endpoints: [
      'GET /search?q=course_name',
      'GET /courses/:courseId',
      'GET /nearby?lat=&lng=&radius=&limit='
    ],
    api_source: 'golfcourseapi.com'
  });
});

router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    console.log(`🔍 Searching for golf courses: "${query}"`);

    const courses = await golfCourseApi.searchCourses(query, parseInt(limit));

    res.json(courses.map(course => ({
      ...course,
      source: 'golfcourseapi'
    })));

  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    res.status(500).json({
      error: 'Course search failed',
      message: error.message
    });
  }
});

router.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log(`🏌️ Getting course details for: ${courseId}`);

    const courseData = await golfCourseApi.getCourseById(courseId);
    res.json({
      ...courseData,
      source: 'golfcourseapi'
    });

  } catch (error) {
    console.error('❌ Course details error:', error);
    res.status(404).json({
      error: 'Course not found',
      message: error.message
    });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 25, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Latitude and longitude parameters are required'
      });
    }

    console.log(`🌍 Searching for nearby courses: lat=${lat}, lng=${lng}, radius=${radius}km`);

    const courses = await golfCourseApi.getCoursesNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      parseInt(limit)
    );

    res.json(courses.map(course => ({
      ...course,
      source: 'golfcourseapi'
    })));

  } catch (error) {
    console.error('❌ Nearby courses error:', error);
    res.status(500).json({
      error: 'Failed to get nearby courses',
      message: error.message
    });
  }
});

router.post('/scrape-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    console.log(`🏌️ Scraping scorecard from user-provided URL: ${url}`);

    // Create a new scraper for general scorecard pages
    const courseData = await scrapeGeneralScorecard(url);

    res.json({
      success: true,
      course: courseData,
      source_url: url
    });

  } catch (error) {
    console.error('❌ URL scrape endpoint error:', error);
    res.status(500).json({
      error: 'URL scraping failed',
      message: error.message
    });
  }
});

// General scorecard scraper function
async function scrapeGeneralScorecard(url) {
  const puppeteer = require('puppeteer-core');
  const cheerio = require('cheerio');

  let browser;
  try {
    console.log(`🔍 Launching browser to scrape: ${url}`);

    // Windows Chrome paths
    const windowsChromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ];

    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;

    // Try to find Chrome on Windows if no explicit path is set
    if (!executablePath && process.platform === 'win32') {
      for (const path of windowsChromePaths) {
        try {
          const fs = require('fs');
          if (fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract course name from page title or headers
    let courseName = $('title').text().replace(/\s*-\s*Scorecard.*$/i, '').trim();
    if (!courseName) {
      courseName = $('h1').first().text().trim() || 'Unknown Course';
    }

    console.log(`📋 Extracting scorecard for: ${courseName}`);

    // Look for scorecard table
    const holes = [];
    const teeColors = [];

    // Find tables that contain scorecard data
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      const rows = $table.find('tr');

      if (rows.length < 3) return; // Skip small tables

      console.log(`🔍 Checking table ${tableIndex + 1} with ${rows.length} rows`);

      // Look for header row with tee colors
      let headerRow = null;
      let holeColumnIndex = -1;
      let teeColumnIndexes = {};
      let parColumnIndex = -1;
      let handicapColumnIndex = -1;

      rows.each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');

        // Check if this looks like a header row
        cells.each((cellIndex, cell) => {
          const text = $(cell).text().trim().toLowerCase();

          if (text.includes('hole')) {
            holeColumnIndex = cellIndex;
            headerRow = $row;
          }

          // Look for tee colors
          const teeColorsList = ['white', 'yellow', 'red', 'blue', 'black', 'gold', 'green', 'orange', 'purple'];
          for (const color of teeColorsList) {
            if (text.includes(color)) {
              teeColumnIndexes[color] = cellIndex;
              if (!teeColors.includes(color)) {
                teeColors.push(color);
              }
            }
          }

          if (text.includes('par')) {
            parColumnIndex = cellIndex;
          }

          if (text.includes('hdcp') || text.includes('handicap') || text.includes('index')) {
            handicapColumnIndex = cellIndex;
          }
        });
      });

      if (headerRow && holeColumnIndex !== -1) {
        console.log(`✅ Found scorecard header at row ${rows.index(headerRow)}`);
        console.log(`📍 Columns: Hole=${holeColumnIndex}, Par=${parColumnIndex}, HDCP=${handicapColumnIndex}`);
        console.log(`🏌️ Tee colors found:`, Object.keys(teeColumnIndexes));

        // Process data rows
        rows.each((rowIndex, row) => {
          if (row === headerRow[0]) return; // Skip header

          const $row = $(row);
          const cells = $row.find('td, th');

          if (cells.length < 3) return; // Skip sparse rows

          const holeText = $(cells[holeColumnIndex]).text().trim();
          const holeNumber = parseInt(holeText);

          // Only process rows with valid hole numbers (1-18)
          if (holeNumber >= 1 && holeNumber <= 18) {
            const hole = {
              number: holeNumber,
              par: null,
              handicap: null,
              yardages: {}
            };

            // Extract par
            if (parColumnIndex !== -1 && cells[parColumnIndex]) {
              const par = parseInt($(cells[parColumnIndex]).text().trim());
              if (par >= 3 && par <= 5) {
                hole.par = par;
              }
            }

            // Extract handicap
            if (handicapColumnIndex !== -1 && cells[handicapColumnIndex]) {
              const handicap = parseInt($(cells[handicapColumnIndex]).text().trim());
              if (handicap >= 1 && handicap <= 18) {
                hole.handicap = handicap;
              }
            }

            // Extract yardages for each tee color
            Object.keys(teeColumnIndexes).forEach(color => {
              const columnIndex = teeColumnIndexes[color];
              if (cells[columnIndex]) {
                const yardage = parseInt($(cells[columnIndex]).text().trim());
                if (yardage >= 50 && yardage <= 700) {
                  hole.yardages[color] = yardage;
                }
              }
            });

            holes.push(hole);
            console.log(`⛳ Hole ${holeNumber}: Par ${hole.par}, HCP ${hole.handicap}, Yardages:`, hole.yardages);
          }
        });
      }
    });

    // Build tee information from discovered colors
    const tees = Object.keys(holes.reduce((allColors, hole) => {
      Object.keys(hole.yardages).forEach(color => allColors[color] = true);
      return allColors;
    }, {})).map(color => ({
      name: color.charAt(0).toUpperCase() + color.slice(1),
      color: color.charAt(0).toUpperCase() + color.slice(1),
      rating: null,
      slope: null
    }));

    const courseData = {
      name: courseName,
      location: 'Unknown Location',
      holes: holes.sort((a, b) => a.number - b.number),
      tees: tees,
      totalPar: holes.reduce((sum, hole) => sum + (hole.par || 0), 0),
      totalYardage: {},
      url: url,
      source: 'user_submitted',
      scrapedAt: new Date().toISOString()
    };

    // Calculate total yardages for each tee
    tees.forEach(tee => {
      const color = tee.color.toLowerCase();
      courseData.totalYardage[color] = holes.reduce((sum, hole) => {
        return sum + (hole.yardages[color] || 0);
      }, 0);
    });

    console.log(`✅ Successfully scraped ${holes.length} holes from ${courseName}`);
    console.log(`🎯 Total Par: ${courseData.totalPar}`);
    console.log(`🏌️ Available tees: ${tees.map(t => t.name).join(', ')}`);

    return courseData;

  } catch (error) {
    console.error('❌ General scorecard scraping failed:', error.message);
    throw new Error(`Scorecard scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = router;