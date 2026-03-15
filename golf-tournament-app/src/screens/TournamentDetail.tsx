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

                  {/* Existing Scorecards for this course */}
                  {(tournament?.scorecards || [])
                    .filter((sc: any) => sc.courseId === course.id)
                    .map((sc: any) => {
                      const scTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;
                      return (
                        <View key={sc.id} style={styles.scorecardRow}>
                          <TouchableOpacity
                            style={styles.scorecardItem}
                            onPress={() => navigation.navigate('GroupScorecard', {
                              scorecard: sc,
                              course,
                              tournamentId: tournament?.id || tournamentId,
                              tournamentName,
                              selectedTeeIndex: scTeeIndex
                            })}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.scorecardIcon}>📋</Text>
                            <View style={styles.scorecardInfo}>
                              <Text style={styles.scorecardPlayers} numberOfLines={1}>
                                {Object.values(sc.playerNames).join(', ')}
                              </Text>
                              <Text style={styles.scorecardMeta}>
                                {sc.playerIds.length} players · by {sc.createdByName}
                              </Text>
                            </View>
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
    backgroundColor: '#f2f5f2',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: '#1b5e20',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 28,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  idBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  idBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    padding: 20,
    paddingBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1b5e20',
    letterSpacing: 1,
    marginBottom: 14,
  },
  sectionToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleArrow: {
    fontSize: 11,
    color: '#1b5e20',
    marginLeft: 6,
    marginBottom: 14,
  },
  leaderboardBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leaderboardBannerLink: {
    fontSize: 13,
    color: '#1565c0',
    fontWeight: '600',
    marginBottom: 14,
  },
  simpleLeaderHeaderRow: {
    backgroundColor: '#1b5e20',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
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
    backgroundColor: '#f9fdf9',
  },
  simpleLeaderHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  simpleLeaderRank: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  simpleLeaderPlayer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1b',
  },
  simpleLeaderPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7b1fa2',
  },
  simpleLeaderBirdie: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e64a19',
  },
  addButton: {
    backgroundColor: '#1b5e20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Empty / loading states
  emptyState: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    color: '#555',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    padding: 30,
  },

  // Course cards
  courseCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  courseAccent: {
    width: 5,
    backgroundColor: '#2e7d32',
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
    fontSize: 17,
    fontWeight: 'bold',
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
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    color: '#4a6741',
    fontWeight: '500',
  },
  teeChip: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#81c784',
  },
  teeChipText: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  courseLocation: {
    fontSize: 13,
    color: '#777',
    marginBottom: 4,
  },
  courseDetails: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  selectedTeeText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 4,
  },

  // Tee selection
  teeSelectionContainer: {
    marginTop: 14,
    paddingLeft: 38,
  },
  teeSelectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
  },
  teeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teeSelectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    marginRight: 8,
    marginBottom: 8,
  },
  teeSelectionButtonSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#2e7d32',
  },
  teeSelectionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
  },
  teeSelectionButtonTextSelected: {
    color: 'white',
  },

  // Course action buttons
  courseButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  editCourseButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1976d2',
  },
  editCourseButtonText: {
    color: '#1976d2',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteCourseButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e53935',
  },
  deleteCourseButtonText: {
    color: '#e53935',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: 'rgba(46,125,50,0.1)',
    borderRadius: 4,
    width: 28,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  disabledOrderButton: {
    backgroundColor: 'rgba(200,200,200,0.15)',
  },
  orderButtonText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: 'bold',
  },
  disabledOrderButtonText: {
    color: '#ccc',
  },

  // Leaderboard
  leaderboardCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: '#1b5e20',
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
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  playerNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1b',
  },
  scoreText: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
  },
  birdieText: {
    fontSize: 15,
    color: '#e64a19',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 15,
    color: '#7b1fa2',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toParText: {
    fontSize: 15,
    color: '#1b5e20',
    fontWeight: 'bold',
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
    backgroundColor: '#1b5e20',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  shareButton: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
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
    padding: 25,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 0.45,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAddButton: {
    flex: 0.45,
    backgroundColor: '#1b5e20',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Edit course modal table
  editHoleHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 4,
  },
  editHoleHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  editHoleInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 2,
    backgroundColor: '#fafafa',
  },

  // Group Scorecards
  createScorecardButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1b5e20',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createScorecardText: {
    color: '#1b5e20',
    fontSize: 14,
    fontWeight: '600',
  },
  scorecardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0f7f0',
    borderRadius: 8,
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
    fontSize: 18,
  },
  scorecardInfo: {
    flex: 1,
  },
  scorecardPlayers: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2e1b',
  },
  scorecardMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  scorecardDeleteBtn: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  scorecardDeleteText: {
    fontSize: 14,
    color: '#c62828',
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
    backgroundColor: '#f0f7f0',
  },
  playerSelectCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerSelectCheckSelected: {
    backgroundColor: '#1b5e20',
    borderColor: '#1b5e20',
  },
  playerSelectCheckMark: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  playerSelectName: {
    fontSize: 15,
    color: '#333',
  },
  playerSelectNameSelected: {
    color: '#1b5e20',
    fontWeight: '600',
  },
});
