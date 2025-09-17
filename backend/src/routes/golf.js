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

    // Detect the source and use appropriate scraper
    let courseData;
    if (url.includes('golfify.io')) {
      console.log('📊 Detected Golfify URL - using JSON scraper');
      courseData = await scrapeGolfifyScorecard(url);
    } else {
      console.log('📋 Using general HTML scraper');
      courseData = await scrapeGeneralScorecard(url);
    }

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

// Golfify JSON scraper function
async function scrapeGolfifyScorecard(url) {
  // Try puppeteer-core first, fall back to puppeteer if browser not found
  let puppeteer;
  try {
    puppeteer = require('puppeteer-core');
  } catch (e) {
    console.log('⚠️ puppeteer-core not available, trying puppeteer');
    puppeteer = require('puppeteer');
  }

  let browser;
  try {
    console.log(`🔍 Launching browser to scrape Golfify: ${url}`);

    // Configure Puppeteer for different environments
    let puppeteerConfig = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // Production environment detection (Railway, Heroku, etc.)
    if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.HEROKU_APP_NAME) {
      console.log('🚀 Configuring Puppeteer for production environment');

      // Try common production browser paths
      const productionPaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome'
      ];

      let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;

      // If no explicit path, try to find browser in production
      if (!executablePath) {
        const fs = require('fs');
        for (const path of productionPaths) {
          if (fs.existsSync(path)) {
            executablePath = path;
            console.log(`📍 Found browser at: ${path}`);
            break;
          }
        }
      }

      if (executablePath) {
        puppeteerConfig.executablePath = executablePath;
      } else {
        // If no browser found in production, log warning and skip executablePath
        // This will let puppeteer try to find its own browser
        console.log('⚠️ No browser executable found in production, trying default puppeteer browser');
      }
    } else {
      // Development environment - try to find local browsers
      console.log('💻 Configuring Puppeteer for development environment');

      const windowsChromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
      ];

      let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_BIN;

      // Try to find Chrome/Edge on Windows if no explicit path is set
      if (!executablePath && process.platform === 'win32') {
        const fs = require('fs');
        for (const path of windowsChromePaths) {
          try {
            if (fs.existsSync(path)) {
              executablePath = path;
              console.log(`📍 Found browser at: ${path}`);
              break;
            }
          } catch (e) {
            // Continue to next path
          }
        }
      }

      if (executablePath) {
        puppeteerConfig.executablePath = executablePath;
      }
    }

    console.log('🔧 Puppeteer config:', { hasExecutablePath: !!puppeteerConfig.executablePath });
    browser = await puppeteer.launch(puppeteerConfig);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Debug: capture page title and basic structure
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500),
        hasScripts: document.scripts.length,
        hasTables: document.querySelectorAll('table').length
      };
    });

    console.log('📄 Page info:', pageInfo);

    // Extract JSON data from the page
    const courseData = await page.evaluate(() => {
      // Look for JSON data in script tags
      const scripts = document.querySelectorAll('script');
      let jsonData = null;

      console.log(`🔍 Found ${scripts.length} script tags to examine`);

      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const content = script.textContent || script.innerText;

        // Look for various patterns that might contain course data
        if (content.includes('tees') || content.includes('holes') || content.includes('course') || content.includes('scorecard')) {
          console.log(`📄 Script ${i} contains course-related data, length: ${content.length}`);

          try {
            // Try multiple JSON extraction patterns
            let jsonMatch = null;

            // Pattern 1: Look for complete JSON objects with tees
            jsonMatch = content.match(/\{[^{}]*"tees"[^{}]*\}/gs);
            if (!jsonMatch) {
              // Pattern 2: Look for any JSON with holes or course data
              jsonMatch = content.match(/\{[^{}]*"holes"[^{}]*\}/gs);
            }
            if (!jsonMatch) {
              // Pattern 3: Look for larger JSON structures
              jsonMatch = content.match(/\{.*?"tees".*?\}/gs);
            }
            if (!jsonMatch) {
              // Pattern 4: Look for window variables
              const windowMatch = content.match(/window\.\w+\s*=\s*(\{.*?\});/gs);
              if (windowMatch) {
                jsonMatch = windowMatch.map(m => m.match(/\{.*\}/)[0]);
              }
            }

            if (jsonMatch) {
              console.log(`🎯 Found ${jsonMatch.length} potential JSON matches in script ${i}`);
              for (const match of jsonMatch) {
                try {
                  const parsed = JSON.parse(match);
                  if (parsed.tees || parsed.holes || (parsed.course && parsed.course.tees)) {
                    console.log(`✅ Successfully parsed course data from script ${i}`);
                    jsonData = parsed.course || parsed;
                    break;
                  }
                } catch (e) {
                  continue;
                }
              }
              if (jsonData) break;
            }
          } catch (e) {
            console.log(`❌ Error parsing script ${i}:`, e.message);
            continue;
          }
        }
      }

      // Also try to extract from meta tags or data attributes
      if (!jsonData) {
        console.log('🔍 Looking for course data in meta tags and data attributes');
        const metas = document.querySelectorAll('meta[name*="course"], meta[property*="course"]');
        const dataElements = document.querySelectorAll('[data-course], [data-scorecard], [data-holes]');
        console.log(`📄 Found ${metas.length} meta tags and ${dataElements.length} data elements`);
      }

      return jsonData;
    });

    // If JSON extraction failed, try table-based DOM extraction
    if (!courseData || !courseData.tees) {
      console.log('🔄 JSON extraction failed, trying table-based DOM extraction...');

      const tableData = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        console.log(`📊 Found ${tables.length} tables for DOM extraction`);

        for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
          const table = tables[tableIndex];
          const rows = table.querySelectorAll('tr');

          if (rows.length < 2) continue;

          console.log(`🔍 Examining table ${tableIndex} with ${rows.length} rows`);

          const extractedHoles = [];

          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());

            // Check if this row contains hole data (starts with hole number 1-18)
            const firstCell = cellTexts[0];
            const holeNumber = parseInt(firstCell);

            if (holeNumber >= 1 && holeNumber <= 18) {
              console.log(`🏌️ Found hole ${holeNumber}: ${cellTexts.slice(0, 6).join(', ')}`);

              // Extract par, yardages, handicap from remaining cells
              let par = 0, handicap = 0;
              const yardages = {};

              for (let i = 1; i < cellTexts.length; i++) {
                const value = parseInt(cellTexts[i]);

                // Par is typically 3, 4, or 5
                if (value >= 3 && value <= 5 && par === 0) {
                  par = value;
                }
                // Handicap is typically 1-18
                else if (value >= 1 && value <= 18 && handicap === 0) {
                  handicap = value;
                }
                // Yardages are typically 100-600
                else if (value >= 100 && value <= 600) {
                  if (!yardages.white) yardages.white = value;
                  else if (!yardages.yellow) yardages.yellow = value;
                  else if (!yardages.red) yardages.red = value;
                }
              }

              if (par > 0) {
                extractedHoles.push({
                  number: holeNumber,
                  par: par,
                  handicap: handicap || 0,
                  yardages: yardages
                });
              }
            }
          }

          // If we found at least 9 holes, consider it valid
          if (extractedHoles.length >= 9) {
            console.log(`✅ Successfully extracted ${extractedHoles.length} holes from DOM`);

            return {
              name: document.title.replace(' - Full Scorecard and Ratings', '').replace('Golfify', '').trim() || 'Golfify Course',
              tees: [
                { name: 'White', color: 'white' },
                { name: 'Yellow', color: 'yellow' },
                { name: 'Red', color: 'red' }
              ],
              holes: extractedHoles
            };
          }
        }

        return null;
      });

      if (tableData && tableData.holes && tableData.holes.length > 0) {
        console.log(`✅ DOM extraction successful, found ${tableData.holes.length} holes`);

        // Process the DOM-extracted data directly
        const totalPar = tableData.holes.reduce((sum, hole) => sum + (hole.par || 0), 0);

        const result = {
          name: tableData.name,
          location: 'Golfify Course',
          totalPar: totalPar,
          holes: tableData.holes,
          tees: tableData.tees,
          holeCount: tableData.holes.length
        };

        console.log(`✅ Successfully processed DOM-extracted course: ${result.name}`);
        console.log(`🎯 Total Par: ${totalPar}, Holes: ${result.holes.length}, Tees: ${result.tees.length}`);

        return result;
      }

      throw new Error('Could not find course data in Golfify page using JSON or DOM extraction');
    }

    // Original JSON processing logic
    console.log(`📊 Found course data with ${courseData.tees.length} tees`);

    // Process the data into our format
    const courseName = courseData.name || 'Unknown Course';
    let holes = [];
    let tees = [];

    // Process each tee
    courseData.tees.forEach((tee, teeIndex) => {
      tees.push({
        name: tee.name || `Tee ${teeIndex + 1}`,
        color: tee.color || tee.name,
        yardage: tee.totalDistance || 0,
        rating: tee.courseRating || 0,
        slope: tee.slopeRating || 0
      });

      // Process holes for the first tee (they should be the same structure)
      if (teeIndex === 0 && tee.holes) {
        tee.holes.forEach(hole => {
          holes.push({
            number: hole.holeNumber || hole.number,
            par: hole.par,
            handicap: hole.strokeIndex || hole.handicap || 0,
            yardages: {
              [tee.name || 'default']: hole.length || hole.distance || 0
            }
          });
        });
      } else if (tee.holes) {
        // Add yardages from other tees to existing holes
        tee.holes.forEach((hole, holeIndex) => {
          if (holes[holeIndex]) {
            holes[holeIndex].yardages[tee.name || `tee${teeIndex + 1}`] = hole.length || hole.distance || 0;
          }
        });
      }
    });

    const totalPar = holes.reduce((sum, hole) => sum + (hole.par || 0), 0);

    const result = {
      name: courseName,
      location: 'Golfify Course',
      totalPar: totalPar,
      holes: holes,
      tees: tees,
      holeCount: holes.length
    };

    console.log(`✅ Successfully scraped Golfify course: ${courseName}`);
    console.log(`🎯 Total Par: ${totalPar}, Holes: ${holes.length}, Tees: ${tees.length}`);

    return result;

  } catch (error) {
    console.error('❌ Golfify scraping failed:', error.message);
    throw new Error(`Golfify scraping failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = router;