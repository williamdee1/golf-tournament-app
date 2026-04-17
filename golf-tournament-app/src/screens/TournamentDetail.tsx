import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
  user?: any;
  sessionToken?: string;
};

type Course = {
  id: string;
  name: string;
  location: string;
  totalPar: number;
  holes: any[];
  tees: any[];
  url: string;
};

function ActiveScorecardsSection({ activeScorecards, courses, tournament, tournamentId, tournamentName, navigation }: any) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={activeStyles.section}>
      <TouchableOpacity style={activeStyles.header} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <Text style={activeStyles.title}>ACTIVE SCORECARDS ({activeScorecards.length})</Text>
        <Text style={activeStyles.arrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && activeScorecards.map((sc: any) => {
        const course = courses.find((c: Course) => c.id === sc.courseId);
        const scTeeIndex = tournament?.courseSettings?.[sc.courseId]?.selectedTeeIndex || 0;
        return (
          <TouchableOpacity
            key={sc.id}
            style={activeStyles.card}
            onPress={() => navigation.navigate('GroupScorecard', {
              scorecard: sc,
              course: course || { id: sc.courseId, name: sc.courseName, holes: [], tees: [] },
              tournamentId: tournament?.id || tournamentId,
              tournamentName,
              selectedTeeIndex: scTeeIndex,
            })}
            activeOpacity={0.7}
          >
            <View style={activeStyles.cardAccent} />
            <View style={activeStyles.cardContent}>
              <Text style={activeStyles.courseName}>{sc.courseName}</Text>
              <Text style={activeStyles.players} numberOfLines={1}>
                {Object.values(sc.playerNames).join(', ')}
              </Text>
              <Text style={activeStyles.meta}>{sc.playerIds.length} players · by {sc.createdByName}</Text>
            </View>
            <Text style={activeStyles.chevron}>›</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const activeStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 2,
  },
  arrow: {
    fontSize: 11,
    color: '#2d9e5f',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#2d9e5f',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a2e1b',
    marginBottom: 4,
  },
  players: {
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },
  meta: {
    fontSize: 11,
    color: '#bbb',
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    paddingRight: 16,
  },
});

export default function TournamentDetail({ navigation, route, user, sessionToken }: Props) {
  const { tournamentName, tournamentId, isExisting } = route.params;
  const [courses, setCourses] = useState<Course[]>([]);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseUrl, setCourseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tournament, setTournament] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTournament, setIsLoadingTournament] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editHoles, setEditHoles] = useState<any[]>([]);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [scorecardModalCourse, setScorecardModalCourse] = useState<Course | null>(null);
  const [scorecardSelectedPlayers, setScorecardSelectedPlayers] = useState<string[]>([]);
  const [coursesExpanded, setCoursesExpanded] = useState(false);

  // Load existing tournament data when component mounts
  useEffect(() => {
    if (isExisting && tournamentId && user && sessionToken) {
      loadTournamentData();
    }
  }, [isExisting, tournamentId, user, sessionToken]);

  const loadTournamentData = async () => {
    setIsLoadingTournament(true);
    try {
      const response = await fetch(API_ENDPOINTS.tournamentDetail(tournamentId), {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setTournament(data.tournament);
        setCourses(data.tournament.courses || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to load tournament data');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setIsLoadingTournament(false);
    }
  };

  const addCourse = async () => {
    if (!courseUrl.trim()) {
      Alert.alert('Error', 'Please enter a scorecard URL');
      return;
    }

    setIsLoading(true);
    try {
      // Scrape the course data from the URL
      const scrapeResponse = await fetch(API_ENDPOINTS.golfScrape, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: courseUrl.trim() }),
      });

      const scrapeData = await scrapeResponse.json();

      if (scrapeData.success) {
        const newCourse: Course = {
          id: Date.now().toString(),
          name: scrapeData.course.name,
          location: scrapeData.course.location,
          totalPar: scrapeData.course.totalPar,
          holes: scrapeData.course.holes,
          tees: scrapeData.course.tees,
          url: courseUrl.trim()
        };

        // If this is an existing tournament, save the course to the backend immediately
        if (isExisting && tournament && user && sessionToken) {
          try {
            const addResponse = await fetch(API_ENDPOINTS.addCourse(tournament.id), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ course: newCourse }),
            });

            const addData = await addResponse.json();

            if (addData.success) {
              setTournament(addData.tournament);
              setCourses(addData.tournament.courses);
              Alert.alert('Success', `${scrapeData.course.name} added to tournament and saved!`);
            } else {
              Alert.alert('Error', addData.error || 'Failed to save course to tournament');
              return;
            }
          } catch (saveError) {
            console.error('Error saving course to tournament:', saveError);
            Alert.alert('Error', 'Failed to save course to tournament. Please try again.');
            return;
          }
        } else {
          // For new tournaments, just add to local state
          setCourses(prevCourses => [...prevCourses, newCourse]);
          Alert.alert('Success', `${scrapeData.course.name} added to tournament!`);
        }

        setCourseUrl('');
        setShowAddCourseModal(false);
      } else {
        Alert.alert('Error', 'Failed to scrape course data from the provided URL');
      }
    } catch (error) {
      console.error('Error adding course:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const removeCourse = (courseId: string) => {
    // Use window.confirm for web compatibility
    const confirmed = window.confirm('Are you sure you want to remove this course from the tournament?');
    if (confirmed) {
      (async () => {
            // If this is an existing tournament, remove from backend
            if (isExisting && tournament && user && sessionToken) {
              try {
                const response = await fetch(API_ENDPOINTS.removeCourse(tournament.id, courseId), {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${sessionToken}`,
                  },
                });

                const data = await response.json();

                if (data.success) {
                  setTournament(data.tournament);
                  setCourses(data.tournament.courses);
                  Alert.alert('Success', 'Course removed from tournament');
                } else {
                  Alert.alert('Error', data.error || 'Failed to remove course from tournament');
                }
              } catch (error) {
                console.error('Error removing course:', error);
                Alert.alert('Error', 'Failed to remove course. Please try again.');
              }
            } else {
              // For new tournaments, just remove from local state
              const filteredCourses = courses.filter(course => course.id !== courseId);
              setCourses(filteredCourses);
            }
      })();
    }
  };

  const setTeeSelection = async (courseId: string, teeIndex: number) => {
    if (!tournament || !user || !sessionToken) {
      Alert.alert('Error', 'You must be the tournament creator to set tee selections');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.setTee(tournament.id, courseId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedTeeIndex: teeIndex }),
      });

      const data = await response.json();

      if (data.success) {
        setTournament(data.tournament);
        Alert.alert('Success', data.message);
      } else {
        Alert.alert('Error', data.error || 'Failed to set tee selection');
      }
    } catch (error) {
      console.error('Set tee selection error:', error);
      Alert.alert('Error', 'Failed to set tee selection. Please try again.');
    }
  };

  const moveCourse = async (courseId: string, direction: 'up' | 'down') => {
    const currentIndex = courses.findIndex(c => c.id === courseId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= courses.length) return;

    // Create new array with moved course
    const newCourses = [...courses];
    const [movedCourse] = newCourses.splice(currentIndex, 1);
    newCourses.splice(newIndex, 0, movedCourse);

    setCourses(newCourses);

    // If this is an existing tournament, update the course order on the backend
    if (isExisting && tournament && user && sessionToken) {
      try {
        const response = await fetch(API_ENDPOINTS.reorderCourses(tournament.id), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ courseOrder: newCourses.map(course => course.id) }),
        });

        const result = await response.json();

        if (result.success) {
          setTournament(result.tournament);
        } else {
          loadTournamentData();
          window.alert('Failed to save course order. Reverting changes.');
        }
      } catch (error) {
        console.error('Error updating course order:', error);
        loadTournamentData();
        window.alert('Failed to save course order. Reverting changes.');
      }
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setEditHoles(course.holes.map(h => ({ ...h })));
  };

  const saveEditedCourse = async () => {
    if (!editingCourse) return;

    const updatedCourse = { ...editingCourse, holes: editHoles, totalPar: editHoles.reduce((s, h) => s + (parseInt(h.par) || 0), 0) };

    if (isExisting && tournament && user && sessionToken) {
      try {
        const response = await fetch(API_ENDPOINTS.updateCourse(tournament.id, editingCourse.id), {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ holes: editHoles }),
        });
        const data = await response.json();
        if (data.success) {
          setTournament(data.tournament);
          setCourses(data.tournament.courses);
        } else {
          Alert.alert('Error', data.error || 'Failed to save course changes');
          return;
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to connect to server.');
        return;
      }
    } else {
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? updatedCourse : c));
    }

    setEditingCourse(null);
    setEditHoles([]);
  };

  const startTournament = async () => {
    if (!user || !sessionToken) {
      Alert.alert('Error', 'You must be logged in to create tournaments');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.tournaments, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tournamentName,
          courses: courses
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTournament(data.tournament);
        Alert.alert(
          'Tournament Created!',
          `Tournament "${tournamentName}" has been created successfully!\n\nTournament ID: ${data.tournament.id}\n\nShare this ID with other players so they can join your tournament.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Create tournament error:', error);
      Alert.alert('Error', 'Failed to connect to server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const createScorecard = async () => {
    if (!scorecardModalCourse || scorecardSelectedPlayers.length === 0) return;
    const tid = tournament?.id || tournamentId;
    try {
      const response = await fetch(API_ENDPOINTS.createScorecard(tid), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ courseId: scorecardModalCourse.id, playerIds: scorecardSelectedPlayers })
      });
      const data = await response.json();
      if (data.success) {
        setTournament(data.tournament);
        setShowScorecardModal(false);
        setScorecardSelectedPlayers([]);
        const selectedTeeIndex = tournament?.courseSettings?.[scorecardModalCourse.id]?.selectedTeeIndex || 0;
        navigation.navigate('GroupScorecard', {
          scorecard: data.scorecard,
          course: scorecardModalCourse,
          tournamentId: tid,
          tournamentName,
          selectedTeeIndex
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to create scorecard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create scorecard');
    }
  };

  const deleteScorecardGroup = async (scorecardId: string) => {
    const tid = tournament?.id || tournamentId;
    try {
      const response = await fetch(API_ENDPOINTS.deleteScorecard(tid, scorecardId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      if (data.success) setTournament(data.tournament);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete scorecard');
    }
  };

  const toggleScorecardPlayer = (playerId: string) => {
    setScorecardSelectedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tournamentName}</Text>
        {(tournament?.id || isExisting) ? (
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>ID: {tournament?.id || tournamentId}</Text>
          </View>
        ) : (
          <Text style={styles.headerSubtitle}>Add courses and start your tournament</Text>
        )}
      </View>

      {/* Active Scorecards Section */}
      {tournament && (tournament.scorecards || []).filter((sc: any) => !sc.submitted).length > 0 && (() => {
        const activeScorecards = (tournament.scorecards || []).filter((sc: any) => !sc.submitted);
        return (
          <>
            <ActiveScorecardsSection
              activeScorecards={activeScorecards}
              courses={courses}
              tournament={tournament}
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              navigation={navigation}
            />
            <View style={styles.sectionDivider} />
          </>
        );
      })()}

      {/* Courses Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setCoursesExpanded(v => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>COURSES ({courses.length})</Text>
            <Text style={styles.toggleArrow}>{coursesExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCourseModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {coursesExpanded && (isLoadingTournament ? (
          <View style={styles.emptyState}>
            <Text style={styles.loadingText}>Loading tournament data...</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⛳</Text>
            <Text style={styles.emptyText}>No courses added yet</Text>
            <Text style={styles.emptySubtext}>Tap Add to include your first course</Text>
          </View>
        ) : (
          courses.map((course, courseIndex) => {
            const isCreator = tournament?.createdBy === user?.id;
            const selectedTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;
            const selectedTee = course.tees?.[selectedTeeIndex] || course.tees?.[0];

            return (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseAccent} />
                <View style={styles.courseCardContent}>

                  {/* Course Order Controls */}
                  {courses.length > 1 && (
                    <View style={styles.orderControls}>
                      <TouchableOpacity
                        style={[styles.orderButton, courseIndex === 0 && styles.disabledOrderButton]}
                        onPress={() => moveCourse(course.id, 'up')}
                        disabled={courseIndex === 0}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.orderButtonText, courseIndex === 0 && styles.disabledOrderButtonText]}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.orderButton, courseIndex === courses.length - 1 && styles.disabledOrderButton]}
                        onPress={() => moveCourse(course.id, 'down')}
                        disabled={courseIndex === courses.length - 1}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.orderButtonText, courseIndex === courses.length - 1 && styles.disabledOrderButtonText]}>↓</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Course Info (tappable) */}
                  <TouchableOpacity
                    style={styles.courseInfo}
                    onPress={() => navigation.navigate('CourseScorecard', {
                      course: course,
                      tournamentId: tournament?.id || tournamentId,
                      tournamentName: tournamentName,
                      selectedTeeIndex: selectedTeeIndex
                    })}
                  >
                    <Text style={styles.courseName}>{course.name}</Text>
                    <View style={styles.courseChips}>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{course.holes.length} holes</Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>Par {course.totalPar}</Text>
                      </View>
                      {selectedTee && (
                        <View style={[styles.chip, styles.teeChip]}>
                          <Text style={[styles.chipText, styles.teeChipText]}>{selectedTee.name}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Tee Selection Buttons */}
                  {isCreator && course.tees && course.tees.length > 1 && (
                    <View style={styles.teeSelectionContainer}>
                      <Text style={styles.teeSelectionLabel}>Select Tee:</Text>
                      <View style={styles.teeButtonsRow}>
                        {course.tees.map((tee, index) => {
                          const isSelected = selectedTeeIndex === index;
                          return (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.teeSelectionButton,
                                isSelected && styles.teeSelectionButtonSelected
                              ]}
                              onPress={() => setTeeSelection(course.id, index)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.teeSelectionButtonText,
                                isSelected && styles.teeSelectionButtonTextSelected
                              ]}>
                                {tee.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Edit / Delete Course Buttons */}
                  {isCreator && (
                    <View style={styles.courseButtonRow}>
                      <TouchableOpacity
                        style={styles.editCourseButton}
                        onPress={() => openEditModal(course)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.editCourseButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteCourseButton}
                        onPress={() => removeCourse(course.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.deleteCourseButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Existing Scorecards for this course */}
                  {(tournament?.scorecards || [])
                    .filter((sc: any) => sc.courseId === course.id)
                    .map((sc: any) => {
                      const scTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;
                      return (
                        <View key={sc.id} style={styles.scorecardRow}>
                          <TouchableOpacity
                            style={[styles.scorecardItem, sc.submitted && styles.scorecardItemSubmitted]}
                            onPress={() => navigation.navigate('GroupScorecard', {
                              scorecard: sc,
                              course,
                              tournamentId: tournament?.id || tournamentId,
                              tournamentName,
                              selectedTeeIndex: scTeeIndex
                            })}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.scorecardIcon}>{sc.submitted ? '✅' : '📋'}</Text>
                            <View style={styles.scorecardInfo}>
                              <Text style={styles.scorecardPlayers} numberOfLines={1}>
                                {Object.values(sc.playerNames).join(', ')}
                              </Text>
                              <Text style={styles.scorecardMeta}>
                                {sc.playerIds.length} players · by {sc.createdByName}
                                {sc.submitted ? ' · Submitted' : ' · In progress'}
                              </Text>
                            </View>
                            {sc.submitted && (
                              <View style={styles.scorecardSubmittedBadge}>
                                <Text style={styles.scorecardSubmittedBadgeText}>✓</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.scorecardDeleteBtn}
                            onPress={() => deleteScorecardGroup(sc.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.scorecardDeleteText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  }

                  {/* Create Scorecard Button */}
                  {tournament && (
                    <TouchableOpacity
                      style={styles.createScorecardButton}
                      onPress={() => {
                        setScorecardModalCourse(course);
                        setScorecardSelectedPlayers(user?.id ? [user.id] : []);
                        setShowScorecardModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.createScorecardText}>+ Create Scorecard</Text>
                    </TouchableOpacity>
                  )}

                </View>
              </View>
            );
          })
        ))}
      </View>

      <View style={styles.sectionDivider} />

      {/* Player Leaderboard Section */}
      {(tournament || isExisting) && courses.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.leaderboardBanner}
            onPress={() => navigation.navigate('FullLeaderboard', {
              tournament,
              courses,
              tournamentId: tournament?.id || tournamentId,
              tournamentName,
            })}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionTitle}>LEADERBOARD</Text>
            <Text style={styles.leaderboardBannerLink}>Full Details →</Text>
          </TouchableOpacity>

          <View style={styles.leaderboardCard}>
            {/* Header Row */}
            <View style={[styles.simpleLeaderRow, styles.simpleLeaderHeaderRow]}>
              <Text style={[styles.simpleLeaderHeaderText, { flex: 1 }]}>#</Text>
              <Text style={[styles.simpleLeaderHeaderText, { flex: 3 }]}>Player</Text>
              <Text style={[styles.simpleLeaderHeaderText, { flex: 2, textAlign: 'center' }]}>Top 3 Avg</Text>
              <Text style={[styles.simpleLeaderHeaderText, { flex: 1, textAlign: 'center' }]}>Birdies</Text>
            </View>

            {tournament?.players && tournament.players.length > 0 ? (() => {
              const calculateStablefordPoints = (score: number, holePar: number, holeHandicap: number, courseHandicapValue: number): number => {
                if (!score || courseHandicapValue === undefined) return 0;
                const strokesReceived = Math.floor(courseHandicapValue / 18) + (holeHandicap <= (courseHandicapValue % 18) ? 1 : 0);
                const adjustedPar = holePar + strokesReceived;
                const difference = score - adjustedPar;
                if (difference <= -4) return 6;
                if (difference === -3) return 5;
                if (difference === -2) return 4;
                if (difference === -1) return 3;
                if (difference === 0) return 2;
                if (difference === 1) return 1;
                return 0;
              };

              const playerData = tournament.players.map((player: any) => {
                const coursePoints = courses.map((course: Course) => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  const playerHandicap = tournament.handicaps?.[player.id]?.[course.id] || 0;
                  if (!courseScores) return null;
                  return course.holes.reduce((pts: number, hole: any, holeIndex: number) => {
                    const holeScore = courseScores[hole.number || (holeIndex + 1)];
                    if (typeof holeScore === 'number') {
                      return pts + calculateStablefordPoints(holeScore, hole.par, hole.handicap, playerHandicap);
                    }
                    return pts;
                  }, 0);
                }).filter((p: number | null) => p !== null) as number[];

                const top3 = [...coursePoints].sort((a: number, b: number) => b - a).slice(0, 3);
                const top3Avg = top3.length > 0 ? top3.reduce((s: number, v: number) => s + v, 0) / top3.length : 0;

                const totalBirdies = courses.reduce((birdieSum: number, course: Course) => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  if (!courseScores) return birdieSum;
                  return birdieSum + course.holes.reduce((b: number, hole: any, holeIndex: number) => {
                    const holeScore = courseScores[hole.number || (holeIndex + 1)];
                    return (typeof holeScore === 'number' && holeScore < hole.par) ? b + 1 : b;
                  }, 0);
                }, 0);

                return { player, top3Avg, totalBirdies };
              });

              playerData.sort((a: any, b: any) => b.top3Avg - a.top3Avg);

              return playerData.map(({ player, top3Avg, totalBirdies }: any, index: number) => (
                <View key={player.id} style={[styles.simpleLeaderRow, index % 2 === 1 && styles.simpleLeaderRowAlt]}>
                  <Text style={[styles.simpleLeaderRank, { flex: 1 }]}>{index + 1}</Text>
                  <Text style={[styles.simpleLeaderPlayer, { flex: 3 }]}>{player.username}</Text>
                  <Text style={[styles.simpleLeaderPoints, { flex: 2, textAlign: 'center' }]}>
                    {top3Avg > 0 ? top3Avg.toFixed(1) : '-'}
                  </Text>
                  <Text style={[styles.simpleLeaderBirdie, { flex: 1, textAlign: 'center' }]}>{totalBirdies}</Text>
                </View>
              ));
            })() : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No players have joined yet</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!tournament && !isExisting && (
          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.disabledButton]}
            disabled={isSaving}
            onPress={startTournament}
          >
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Creating Tournament...' : '🏆  Start Tournament'}
            </Text>
          </TouchableOpacity>
        )}

        {(tournament || isExisting) && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              const idToCopy = tournament?.id || tournamentId;
              try {
                await navigator.clipboard.writeText(idToCopy);
                window.alert(`Tournament ID "${idToCopy}" copied to clipboard!`);
              } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                window.alert(`Tournament ID: ${idToCopy}\n\nCopy this ID manually to share.`);
              }
            }}
          >
            <Text style={styles.shareButtonText}>
              Share ID: {tournament?.id || tournamentId}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Course Modal */}
      <Modal
        visible={!!editingCourse}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Edit Course</Text>
            <Text style={styles.modalSubtitle}>{editingCourse?.name}</Text>

            <View style={styles.editHoleHeader}>
              <Text style={[styles.editHoleHeaderText, { width: 40 }]}>Hole</Text>
              <Text style={[styles.editHoleHeaderText, { width: 60 }]}>Par</Text>
              <Text style={[styles.editHoleHeaderText, { width: 60 }]}>SI</Text>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {editHoles.map((hole, idx) => (
                <View key={hole.number} style={styles.editHoleRow}>
                  <Text style={styles.editHoleNumber}>{hole.number}</Text>
                  <TextInput
                    style={styles.editHoleInput}
                    value={hole.par !== null && hole.par !== undefined ? String(hole.par) : ''}
                    onChangeText={val => {
                      const updated = [...editHoles];
                      updated[idx] = { ...updated[idx], par: val === '' ? null : parseInt(val) || null };
                      setEditHoles(updated);
                    }}
                    keyboardType="numeric"
                    maxLength={1}
                    placeholder="-"
                  />
                  <TextInput
                    style={styles.editHoleInput}
                    value={hole.handicap !== null && hole.handicap !== undefined ? String(hole.handicap) : ''}
                    onChangeText={val => {
                      const updated = [...editHoles];
                      updated[idx] = { ...updated[idx], handicap: val === '' ? null : parseInt(val) || null };
                      setEditHoles(updated);
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="-"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditingCourse(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={saveEditedCourse}
              >
                <Text style={styles.modalAddText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Scorecard Modal */}
      <Modal
        visible={showScorecardModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScorecardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Scorecard</Text>
            <Text style={styles.modalSubtitle}>
              {scorecardModalCourse?.name}{'\n'}Select players in your group
            </Text>

            <ScrollView style={{ maxHeight: 280, marginBottom: 16 }}>
              {(tournament?.players || []).map((player: any) => {
                const isSelected = scorecardSelectedPlayers.includes(player.id);
                const isCurrentUser = player.id === user?.id;
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerSelectRow, isSelected && styles.playerSelectRowSelected]}
                    onPress={() => !isCurrentUser && toggleScorecardPlayer(player.id)}
                    activeOpacity={isCurrentUser ? 1 : 0.7}
                  >
                    <View style={[styles.playerSelectCheck, isSelected && styles.playerSelectCheckSelected]}>
                      {isSelected && <Text style={styles.playerSelectCheckMark}>✓</Text>}
                    </View>
                    <Text style={[styles.playerSelectName, isSelected && styles.playerSelectNameSelected]}>
                      {player.username}{isCurrentUser ? ' (you)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => { setShowScorecardModal(false); setScorecardSelectedPlayers([]); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAddButton, scorecardSelectedPlayers.length === 0 && styles.disabledButton]}
                onPress={createScorecard}
                disabled={scorecardSelectedPlayers.length === 0}
              >
                <Text style={styles.modalAddText}>
                  Start ({scorecardSelectedPlayers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Course Modal */}
      <Modal
        visible={showAddCourseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCourseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Course</Text>
            <Text style={styles.modalSubtitle}>Enter the course scorecard URL</Text>

            <TextInput
              style={styles.urlInput}
              placeholder="e.g., https://algarvegolf.net/pinheirosaltos/scorecard.htm or https://www.golfify.io/courses/woburn-golf-club-duchess"
              value={courseUrl}
              onChangeText={setCourseUrl}
              autoCapitalize="words"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddCourseModal(false);
                  setCourseUrl('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, (!courseUrl.trim() || isLoading) && styles.disabledButton]}
                onPress={addCourse}
                disabled={!courseUrl.trim() || isLoading}
              >
                <Text style={styles.modalAddText}>
                  {isLoading ? 'Adding...' : 'Add Course'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f3f0',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 20,
  },

  // Header
  header: {
    backgroundColor: '#062612',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 28,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  idBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 2,
    marginBottom: 0,
  },
  sectionToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleArrow: {
    fontSize: 11,
    color: '#2d9e5f',
  },
  leaderboardBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  leaderboardBannerLink: {
    fontSize: 12,
    color: '#2d9e5f',
    fontWeight: '500',
  },
  simpleLeaderHeaderRow: {
    backgroundColor: '#062612',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  simpleLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  simpleLeaderRowAlt: {
    backgroundColor: '#f7f9f7',
  },
  simpleLeaderHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  simpleLeaderRank: {
    fontSize: 13,
    color: '#bbb',
    fontWeight: '500',
  },
  simpleLeaderPlayer: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1b',
  },
  simpleLeaderPoints: {
    fontSize: 15,
    fontWeight: '600',
    color: '#064E3B',
  },
  simpleLeaderBirdie: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e64a19',
  },
  addButton: {
    backgroundColor: '#2d9e5f',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Empty / loading states
  emptyState: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '400',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    padding: 30,
  },

  // Course cards
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  courseAccent: {
    width: 3,
    backgroundColor: '#2d9e5f',
  },
  courseCardContent: {
    flex: 1,
    padding: 14,
  },
  courseInfo: {
    paddingLeft: 38,
    paddingRight: 8,
    marginBottom: 4,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2e1b',
    marginBottom: 8,
  },
  courseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#f0f4f0',
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  teeChip: {
    backgroundColor: 'rgba(45,158,95,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45,158,95,0.3)',
  },
  teeChipText: {
    color: '#2d9e5f',
    fontWeight: '600',
  },
  courseLocation: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
  },
  courseDetails: {
    fontSize: 11,
    color: '#bbb',
    marginBottom: 2,
  },
  selectedTeeText: {
    fontSize: 12,
    color: '#2d9e5f',
    fontWeight: '500',
    marginTop: 4,
  },

  // Tee selection
  teeSelectionContainer: {
    marginTop: 14,
    paddingLeft: 38,
  },
  teeSelectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  teeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teeSelectionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    marginRight: 8,
    marginBottom: 8,
  },
  teeSelectionButtonSelected: {
    borderColor: '#2d9e5f',
    backgroundColor: '#2d9e5f',
  },
  teeSelectionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#777',
  },
  teeSelectionButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },

  // Course action buttons
  courseButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  editCourseButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  editCourseButtonText: {
    color: '#1565c0',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteCourseButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  deleteCourseButtonText: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '500',
  },

  // Order controls
  orderControls: {
    position: 'absolute',
    left: 8,
    top: 14,
    flexDirection: 'column',
    zIndex: 10,
  },
  orderButton: {
    backgroundColor: 'rgba(45,158,95,0.08)',
    borderRadius: 3,
    width: 26,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  disabledOrderButton: {
    backgroundColor: 'rgba(200,200,200,0.1)',
  },
  orderButtonText: {
    color: '#2d9e5f',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledOrderButtonText: {
    color: '#ddd',
  },

  // Leaderboard
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
    width: '100%',
  },
  leaderboardScrollContent: {
    flexGrow: 1,
  },
  leaderboard: {
    padding: 0,
  },
  leaderboardHeaderRow: {
    backgroundColor: '#062612',
    paddingVertical: 10,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  playerNameHeader: {
    width: 120,
    paddingHorizontal: 14,
  },
  courseHeader: {
    width: 95,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  scoreHeader: {
    width: 72,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  playerNameCell: {
    width: 120,
    paddingHorizontal: 14,
  },
  scoreCell: {
    width: 95,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  leaderboardHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1b',
  },
  scoreText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  birdieText: {
    fontSize: 14,
    color: '#e64a19',
    fontWeight: '600',
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 14,
    color: '#7b1fa2',
    fontWeight: '600',
    textAlign: 'center',
  },
  toParText: {
    fontSize: 14,
    color: '#2d9e5f',
    fontWeight: '600',
    textAlign: 'center',
  },
  clickableScoreText: {
    color: '#1565c0',
    textDecorationLine: 'underline',
  },

  // Action buttons
  actions: {
    padding: 20,
    paddingTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2d9e5f',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: 'rgba(45,158,95,0.25)',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  shareButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d9e5f',
  },
  shareButtonText: {
    color: '#2d9e5f',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 6,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#062612',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 14,
    fontSize: 14,
    marginBottom: 24,
    backgroundColor: '#fafafa',
    minHeight: 60,
    textAlignVertical: 'top',
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 0.45,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  modalCancelText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  modalAddButton: {
    flex: 0.45,
    backgroundColor: '#2d9e5f',
    padding: 13,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Edit course modal table
  editHoleHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 4,
  },
  editHoleHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  editHoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editHoleNumber: {
    width: 40,
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
  editHoleInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 2,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },

  // Group Scorecards
  createScorecardButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2d9e5f',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createScorecardText: {
    color: '#2d9e5f',
    fontSize: 13,
    fontWeight: '500',
  },
  scorecardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f5f8f5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  scorecardItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  scorecardIcon: {
    fontSize: 14,
  },
  scorecardInfo: {
    flex: 1,
  },
  scorecardPlayers: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a2e1b',
  },
  scorecardMeta: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
  },
  scorecardItemSubmitted: {
    backgroundColor: '#f5f8f5',
  },
  scorecardSubmittedBadge: {
    backgroundColor: '#2d9e5f',
    borderRadius: 3,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  scorecardSubmittedBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scorecardDeleteBtn: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  scorecardDeleteText: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: 'bold',
  },

  // Player selection in scorecard modal
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  playerSelectRowSelected: {
    backgroundColor: '#f5f8f5',
  },
  playerSelectCheck: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerSelectCheckSelected: {
    backgroundColor: '#2d9e5f',
    borderColor: '#2d9e5f',
  },
  playerSelectCheckMark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerSelectName: {
    fontSize: 15,
    color: '#555',
    fontWeight: '400',
  },
  playerSelectNameSelected: {
    color: '#062612',
    fontWeight: '500',
  },
});
