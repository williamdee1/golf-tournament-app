// API Configuration
// Update the PRODUCTION_API_URL with your server's IP address or domain

const DEVELOPMENT_API_URL = 'http://localhost:3001';
const FALLBACK_PRODUCTION_URL = 'https://golf-production-2296.up.railway.app';

// Get production URL from environment or fallback
const envProductionUrl = process.env.EXPO_PUBLIC_API_URL;
const PRODUCTION_API_URL = envProductionUrl && envProductionUrl !== 'http://localhost:3001'
  ? envProductionUrl
  : FALLBACK_PRODUCTION_URL;

// Environment detection
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const isDevelopment = process.env.NODE_ENV === 'development' || isLocalhost;

export const API_BASE_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

// Debug logging
console.log('API Configuration:', {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
  envProductionUrl,
  PRODUCTION_API_URL,
  isDevelopment,
  isLocalhost,
  finalApiUrl: API_BASE_URL
});

export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,

  // Tournaments
  tournaments: `${API_BASE_URL}/api/tournaments`,
  tournamentDetail: (id: string) => `${API_BASE_URL}/api/tournaments/${id}`,
  joinTournament: (id: string) => `${API_BASE_URL}/api/tournaments/${id}/join`,
  createdTournaments: `${API_BASE_URL}/api/tournaments/created`,
  joinedTournaments: `${API_BASE_URL}/api/tournaments/joined`,

  // Courses
  addCourse: (tournamentId: string) => `${API_BASE_URL}/api/tournaments/${tournamentId}/courses`,
  removeCourse: (tournamentId: string, courseId: string) => `${API_BASE_URL}/api/tournaments/${tournamentId}/courses/${courseId}`,
  setTee: (tournamentId: string, courseId: string) => `${API_BASE_URL}/api/tournaments/${tournamentId}/courses/${courseId}/tee`,

  // Scoring
  saveScore: (tournamentId: string, courseId: string, holeNumber: number) =>
    `${API_BASE_URL}/api/tournaments/${tournamentId}/scores/${courseId}/${holeNumber}`,
  saveHandicap: (tournamentId: string, courseId: string) =>
    `${API_BASE_URL}/api/tournaments/${tournamentId}/handicap/${courseId}`,

  // Golf Course Data
  golfSearch: `${API_BASE_URL}/api/golf/search`,
  golfScrape: `${API_BASE_URL}/api/golf/scrape-url`,

  // Test endpoint
  test: `${API_BASE_URL}/api/test`
};

export default {
  API_BASE_URL,
  API_ENDPOINTS
};