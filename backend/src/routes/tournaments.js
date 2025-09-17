const express = require('express');
const crypto = require('crypto');
const authRouter = require('./auth');

const router = express.Router();

// Simple in-memory storage (in production, this would be a proper database)
let tournaments = [];

// Helper function to generate tournament ID
const generateTournamentId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create new tournament
router.post('/', authRouter.authenticateUser, (req, res) => {
  try {
    const { name, courses } = req.body;
    const user = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tournament name is required'
      });
    }

    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        error: 'At least one course is required'
      });
    }

    const tournamentId = generateTournamentId();
    const newTournament = {
      id: tournamentId,
      name: name.trim(),
      courses: courses,
      createdBy: user.id,
      createdByName: user.username,
      createdAt: new Date().toISOString(),
      status: 'active',
      players: [{
        id: user.id,
        username: user.username,
        email: user.email,
        handicapIndex: user.handicapIndex,
        joinedAt: new Date().toISOString(),
        isCreator: true
      }],
      scores: {},
      handicaps: {}, // Store course handicaps per player per course
      courseSettings: {} // Store tee selections per course
    };

    tournaments.push(newTournament);

    // Add tournament to user's created tournaments
    const userIndex = authRouter.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      authRouter.users[userIndex].tournaments.push({
        id: tournamentId,
        role: 'creator',
        joinedAt: new Date().toISOString()
      });
    }

    console.log(`✅ Tournament created: ${name} (ID: ${tournamentId}) by ${user.username}`);

    res.json({
      success: true,
      tournament: {
        id: tournamentId,
        name: newTournament.name,
        courses: newTournament.courses,
        createdBy: newTournament.createdBy,
        createdByName: newTournament.createdByName,
        createdAt: newTournament.createdAt,
        status: newTournament.status,
        players: newTournament.players
      }
    });

  } catch (error) {
    console.error('❌ Tournament creation error:', error);
    res.status(500).json({
      error: 'Tournament creation failed',
      message: error.message
    });
  }
});

// Get user's created tournaments
router.get('/created', authRouter.authenticateUser, (req, res) => {
  try {
    const user = req.user;

    const userTournaments = tournaments.filter(t => t.createdBy === user.id);

    res.json({
      success: true,
      tournaments: userTournaments.map(t => ({
        id: t.id,
        name: t.name,
        coursesCount: t.courses.length,
        playersCount: t.players.length,
        createdAt: t.createdAt,
        status: t.status
      }))
    });

  } catch (error) {
    console.error('❌ Get created tournaments error:', error);
    res.status(500).json({
      error: 'Failed to get created tournaments',
      message: error.message
    });
  }
});

// Get user's joined tournaments
router.get('/joined', authRouter.authenticateUser, (req, res) => {
  try {
    const user = req.user;

    const joinedTournaments = tournaments.filter(t =>
      t.players.some(p => p.id === user.id) && t.createdBy !== user.id
    );

    res.json({
      success: true,
      tournaments: joinedTournaments.map(t => ({
        id: t.id,
        name: t.name,
        coursesCount: t.courses.length,
        playersCount: t.players.length,
        createdBy: t.createdByName,
        createdAt: t.createdAt,
        status: t.status
      }))
    });

  } catch (error) {
    console.error('❌ Get joined tournaments error:', error);
    res.status(500).json({
      error: 'Failed to get joined tournaments',
      message: error.message
    });
  }
});

// Get tournament details
router.get('/:id', authRouter.authenticateUser, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    // Check if user is part of this tournament
    const isPlayer = tournament.players.some(p => p.id === user.id);
    if (!isPlayer) {
      return res.status(403).json({
        error: 'You are not part of this tournament'
      });
    }

    res.json({
      success: true,
      tournament: tournament
    });

  } catch (error) {
    console.error('❌ Get tournament error:', error);
    res.status(500).json({
      error: 'Failed to get tournament',
      message: error.message
    });
  }
});

// Join tournament by ID
router.post('/:id/join', authRouter.authenticateUser, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is already part of this tournament
    const alreadyJoined = tournament.players.some(p => p.id === user.id);
    if (alreadyJoined) {
      return res.status(409).json({
        error: 'You are already part of this tournament'
      });
    }

    // Add user to tournament
    const newPlayer = {
      id: user.id,
      username: user.username,
      email: user.email,
      handicapIndex: user.handicapIndex,
      joinedAt: new Date().toISOString(),
      isCreator: false
    };

    tournaments[tournamentIndex].players.push(newPlayer);

    // Add tournament to user's joined tournaments
    const userIndex = authRouter.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      authRouter.users[userIndex].tournaments.push({
        id: tournament.id,
        role: 'player',
        joinedAt: new Date().toISOString()
      });
    }

    console.log(`✅ User ${user.username} joined tournament: ${tournament.name} (ID: ${id})`);

    res.json({
      success: true,
      message: `Successfully joined ${tournament.name}`,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        coursesCount: tournament.courses.length,
        playersCount: tournament.players.length
      }
    });

  } catch (error) {
    console.error('❌ Join tournament error:', error);
    res.status(500).json({
      error: 'Failed to join tournament',
      message: error.message
    });
  }
});

// Add course to existing tournament
router.post('/:id/courses', authRouter.authenticateUser, (req, res) => {
  try {
    const { id } = req.params;
    const { course } = req.body;
    const user = req.user;

    if (!course) {
      return res.status(400).json({
        error: 'Course data is required'
      });
    }

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is part of this tournament (for now, allow any participant to add courses)
    const isPlayer = tournament.players.some(p => p.id === user.id);
    if (!isPlayer) {
      return res.status(403).json({
        error: 'You are not part of this tournament'
      });
    }

    // Add course to tournament
    tournaments[tournamentIndex].courses.push(course);

    console.log(`✅ Course "${course.name}" added to tournament: ${tournament.name} (ID: ${id}) by ${user.username}`);

    res.json({
      success: true,
      message: `Course "${course.name}" added to tournament`,
      tournament: tournaments[tournamentIndex]
    });

  } catch (error) {
    console.error('❌ Add course to tournament error:', error);
    res.status(500).json({
      error: 'Failed to add course to tournament',
      message: error.message
    });
  }
});

// Remove course from existing tournament
router.delete('/:id/courses/:courseId', authRouter.authenticateUser, (req, res) => {
  try {
    const { id, courseId } = req.params;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is part of this tournament
    const isPlayer = tournament.players.some(p => p.id === user.id);
    if (!isPlayer) {
      return res.status(403).json({
        error: 'You are not part of this tournament'
      });
    }

    // Remove course from tournament
    const courseIndex = tournaments[tournamentIndex].courses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) {
      return res.status(404).json({
        error: 'Course not found in tournament'
      });
    }

    const removedCourse = tournaments[tournamentIndex].courses[courseIndex];
    tournaments[tournamentIndex].courses.splice(courseIndex, 1);

    console.log(`✅ Course "${removedCourse.name}" removed from tournament: ${tournament.name} (ID: ${id}) by ${user.username}`);

    res.json({
      success: true,
      message: `Course "${removedCourse.name}" removed from tournament`,
      tournament: tournaments[tournamentIndex]
    });

  } catch (error) {
    console.error('❌ Remove course from tournament error:', error);
    res.status(500).json({
      error: 'Failed to remove course from tournament',
      message: error.message
    });
  }
});

// Delete tournament (creator only)
router.delete('/:id', authRouter.authenticateUser, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is the creator of this tournament
    if (tournament.createdBy !== user.id) {
      return res.status(403).json({
        error: 'Only the tournament creator can delete this tournament'
      });
    }

    // Remove tournament from user's tournaments list
    const userIndex = authRouter.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      authRouter.users[userIndex].tournaments = authRouter.users[userIndex].tournaments.filter(
        t => t.id !== tournament.id
      );
    }

    // Remove tournament from all players' tournament lists
    tournament.players.forEach(player => {
      const playerIndex = authRouter.users.findIndex(u => u.id === player.id);
      if (playerIndex !== -1) {
        authRouter.users[playerIndex].tournaments = authRouter.users[playerIndex].tournaments.filter(
          t => t.id !== tournament.id
        );
      }
    });

    // Remove tournament from tournaments array
    tournaments.splice(tournamentIndex, 1);

    console.log(`🗑️ Tournament deleted: ${tournament.name} (ID: ${id}) by ${user.username}`);

    res.json({
      success: true,
      message: `Tournament "${tournament.name}" has been deleted`
    });

  } catch (error) {
    console.error('❌ Delete tournament error:', error);
    res.status(500).json({
      error: 'Failed to delete tournament',
      message: error.message
    });
  }
});

// Set tee selection for a course (creator only)
router.put('/:id/courses/:courseId/tee', authRouter.authenticateUser, (req, res) => {
  try {
    const { id, courseId } = req.params;
    const { selectedTeeIndex } = req.body;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is the creator of this tournament
    if (tournament.createdBy !== user.id) {
      return res.status(403).json({
        error: 'Only the tournament creator can set tee selections'
      });
    }

    // Find the course
    const course = tournament.courses.find(c => c.id === courseId);
    if (!course) {
      return res.status(404).json({
        error: 'Course not found in tournament'
      });
    }

    // Validate tee index
    if (selectedTeeIndex < 0 || selectedTeeIndex >= course.tees.length) {
      return res.status(400).json({
        error: 'Invalid tee selection'
      });
    }

    // Initialize courseSettings if it doesn't exist
    if (!tournaments[tournamentIndex].courseSettings) {
      tournaments[tournamentIndex].courseSettings = {};
    }

    // Set the tee selection
    tournaments[tournamentIndex].courseSettings[courseId] = {
      selectedTeeIndex: selectedTeeIndex,
      selectedTee: course.tees[selectedTeeIndex]
    };

    console.log(`✅ Tee selection set for course "${course.name}" in tournament: ${tournament.name} (ID: ${id}) by ${user.username}`);

    res.json({
      success: true,
      message: `Tee selection updated for ${course.name}`,
      tournament: tournaments[tournamentIndex]
    });

  } catch (error) {
    console.error('❌ Set tee selection error:', error);
    res.status(500).json({
      error: 'Failed to set tee selection',
      message: error.message
    });
  }
});

// Save course handicap for a player (any tournament participant)
router.put('/:id/handicap/:courseId', authRouter.authenticateUser, (req, res) => {
  try {
    const { id, courseId } = req.params;
    const { courseHandicap } = req.body;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is part of this tournament
    const isPlayer = tournament.players.some(p => p.id === user.id);
    if (!isPlayer) {
      return res.status(403).json({
        error: 'You are not part of this tournament'
      });
    }

    // Validate handicap
    if (typeof courseHandicap !== 'number' || courseHandicap < 0 || courseHandicap > 54) {
      return res.status(400).json({
        error: 'Invalid course handicap value'
      });
    }

    // Initialize handicaps structure if it doesn't exist
    if (!tournaments[tournamentIndex].handicaps) {
      tournaments[tournamentIndex].handicaps = {};
    }
    if (!tournaments[tournamentIndex].handicaps[user.id]) {
      tournaments[tournamentIndex].handicaps[user.id] = {};
    }

    // Save the course handicap
    tournaments[tournamentIndex].handicaps[user.id][courseId] = courseHandicap;

    console.log(`✅ Course handicap saved: ${user.username} set handicap ${courseHandicap} for course ${courseId} in tournament ${id}`);

    res.json({
      success: true,
      message: 'Course handicap saved successfully',
      tournament: tournaments[tournamentIndex]
    });

  } catch (error) {
    console.error('❌ Save course handicap error:', error);
    res.status(500).json({
      error: 'Failed to save course handicap',
      message: error.message
    });
  }
});

// Save score for a hole (any tournament participant)
router.put('/:id/scores/:courseId/:holeNumber', authRouter.authenticateUser, (req, res) => {
  try {
    const { id, courseId, holeNumber } = req.params;
    const { score } = req.body;
    const user = req.user;

    const tournamentIndex = tournaments.findIndex(t => t.id === id);
    if (tournamentIndex === -1) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    const tournament = tournaments[tournamentIndex];

    // Check if user is part of this tournament
    const isPlayer = tournament.players.some(p => p.id === user.id);
    if (!isPlayer) {
      return res.status(403).json({
        error: 'You are not part of this tournament'
      });
    }

    // Validate score
    if (typeof score !== 'number' || score < 1 || score > 20) {
      return res.status(400).json({
        error: 'Invalid score value'
      });
    }

    // Initialize scores structure if it doesn't exist
    if (!tournaments[tournamentIndex].scores) {
      tournaments[tournamentIndex].scores = {};
    }
    if (!tournaments[tournamentIndex].scores[user.id]) {
      tournaments[tournamentIndex].scores[user.id] = {};
    }
    if (!tournaments[tournamentIndex].scores[user.id][courseId]) {
      tournaments[tournamentIndex].scores[user.id][courseId] = {};
    }

    // Save the score
    tournaments[tournamentIndex].scores[user.id][courseId][holeNumber] = score;

    console.log(`✅ Score saved: ${user.username} scored ${score} on hole ${holeNumber} of course ${courseId} in tournament ${id}`);

    res.json({
      success: true,
      message: 'Score saved successfully',
      tournament: tournaments[tournamentIndex]
    });

  } catch (error) {
    console.error('❌ Save score error:', error);
    res.status(500).json({
      error: 'Failed to save score',
      message: error.message
    });
  }
});

// Get tournament info for joining (public endpoint for tournament ID lookup)
router.get('/:id/info', (req, res) => {
  try {
    const { id } = req.params;

    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) {
      return res.status(404).json({
        error: 'Tournament not found'
      });
    }

    // Return limited public info
    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        coursesCount: tournament.courses.length,
        playersCount: tournament.players.length,
        createdBy: tournament.createdByName,
        createdAt: tournament.createdAt,
        status: tournament.status
      }
    });

  } catch (error) {
    console.error('❌ Get tournament info error:', error);
    res.status(500).json({
      error: 'Failed to get tournament info',
      message: error.message
    });
  }
});

module.exports = router;