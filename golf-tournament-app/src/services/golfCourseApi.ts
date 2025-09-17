import { GOLF_COURSE_API } from '../constants/api';
import { GolfCourse } from '../types/golf';

class GolfCourseApiService {
  private baseUrl = GOLF_COURSE_API.BASE_URL;
  private apiKey = GOLF_COURSE_API.API_KEY;

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log('Making request to backend:', url);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Backend API Response:', data);
      return data;
    } catch (error) {
      console.error('Backend API request failed:', error);
      throw error;
    }
  }

  async searchCourses(query: string, limit: number = 20): Promise<GolfCourse[]> {
    return this.makeRequest<GolfCourse[]>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async searchCoursesWithOptions(query: string): Promise<{
    success: boolean;
    multipleResults: boolean;
    courses: GolfCourse[];
    error?: string;
  }> {
    return this.makeRequest(`/search-options?q=${encodeURIComponent(query)}`);
  }

  async getCourseById(courseId: string): Promise<GolfCourse> {
    return this.makeRequest<GolfCourse>(`/courses/${courseId}`);
  }

  async getCourseDetails(courseId: string): Promise<GolfCourse> {
    return this.makeRequest<GolfCourse>(`/courses/${courseId}`);
  }

  async getCoursesNearby(lat: number, lng: number, radius: number = 25, limit: number = 20): Promise<GolfCourse[]> {
    return this.makeRequest<GolfCourse[]>(`/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing backend API connection...');
      const result = await this.makeRequest('/test');
      console.log('✓ Backend API connection successful!', result);
      return true;
    } catch (error) {
      console.error('Backend API connection test failed:', error);
      return false;
    }
  }
}

export const golfCourseApi = new GolfCourseApiService();