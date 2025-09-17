// API Configuration

const DEVELOPMENT_API_URL = 'http://localhost:3001';
const PRODUCTION_API_URL = 'https://golf-production-2296.up.railway.app';

// Determine if we're in development based on multiple factors
const isDevelopment = 
  process.env.NODE_ENV === 'development' || 
  __DEV__ ||  // Expo/React Native specific
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Use development API only if explicitly in development mode
export const API_BASE_URL = isDevelopment ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('API Configuration:', {
    hostname: window.location.hostname,
    NODE_ENV: process.env.NODE_ENV,
    __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined',
    isDevelopment,
    API_BASE_URL
  });
}

export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,

  // Tournaments
  tournaments: `${API_BASE_URL}/api/tournaments`,
  tournamentDetail: (id: string) => `${API_BASE_URL}/api/tournaments/${id}`,
  joinTournament: (id: string) => `${API_BASE_URL}/api/tournaments/${id}/join`,
  createdTournaments: `${API_BASE_URL}/api/tournaments/created`,
  joinedTournaments: `${API_BASE_URL}/api/tournaments/joined`,
  deleteTournament: (id: string) => `${API_BASE_URL}/api/tournaments/${id}`,
  reorderCourses: (id: string) => `${API_BASE_URL}/api/tournaments/${id}/reorder-courses`,

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