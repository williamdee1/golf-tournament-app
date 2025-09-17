const axios = require('axios');

class GolfCourseApiService {
  constructor() {
    this.baseUrl = 'https://api.golfcourseapi.com/v1';
    this.apiKey = process.env.GOLF_COURSE_API_KEY || '';
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          key: this.apiKey
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error(`Golf Course API request failed: ${error.message}`);
      throw new Error(`Golf Course API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchCourses(query, limit = 20) {
    const data = await this.makeRequest('/courses', {
      name: query,
      limit: limit
    });

    return (data.courses || []).map(course => ({
      id: course.id,
      name: course.name,
      location: `${course.city}, ${course.state_province}`,
      country: course.country,
      totalPar: course.scorecard?.[0]?.par_total || null,
      holeCount: course.hole_count || 18,
      phone: course.phone,
      website: course.website,
      source: 'golfcourseapi'
    }));
  }

  async getCourseById(courseId) {
    const data = await this.makeRequest(`/courses/${courseId}`);

    const course = data.course;
    if (!course) {
      throw new Error('Course not found');
    }

    return {
      id: course.id,
      name: course.name,
      location: `${course.city}, ${course.state_province}`,
      country: course.country,
      phone: course.phone,
      website: course.website,
      holes: this.formatHoles(course.holes || []),
      tees: this.formatTees(course.scorecard || []),
      source: 'golfcourseapi'
    };
  }

  async getCoursesNearby(lat, lng, radius = 25, limit = 20) {
    const data = await this.makeRequest('/courses', {
      lat: lat,
      lng: lng,
      radius: radius,
      limit: limit
    });

    return (data.courses || []).map(course => ({
      id: course.id,
      name: course.name,
      location: `${course.city}, ${course.state_province}`,
      country: course.country,
      distance: course.distance,
      totalPar: course.scorecard?.[0]?.par_total || null,
      holeCount: course.hole_count || 18,
      source: 'golfcourseapi'
    }));
  }

  formatHoles(holes) {
    return holes.map(hole => ({
      number: hole.hole_number,
      par: hole.par,
      handicap: hole.handicap,
      yardages: {
        championship: hole.tee_distances?.championship || null,
        men: hole.tee_distances?.mens || null,
        women: hole.tee_distances?.womens || null,
        senior: hole.tee_distances?.senior || null
      }
    }));
  }

  formatTees(scorecard) {
    const tees = [];

    if (scorecard.length > 0) {
      const card = scorecard[0];

      if (card.tees) {
        card.tees.forEach(tee => {
          tees.push({
            name: tee.name,
            color: tee.color,
            rating: tee.course_rating,
            slope: tee.slope_rating,
            yardage: tee.total_yardage
          });
        });
      }
    }

    return tees;
  }
}

module.exports = new GolfCourseApiService();