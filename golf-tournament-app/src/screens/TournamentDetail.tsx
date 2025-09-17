import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

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

  // Load existing tournament data when component mounts
  useEffect(() => {
    if (isExisting && tournamentId && user && sessionToken) {
      loadTournamentData();
    }
  }, [isExisting, tournamentId, user, sessionToken]);

  const loadTournamentData = async () => {
    setIsLoadingTournament(true);
    try {
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}`, {
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
      const scrapeResponse = await fetch('http://localhost:3001/api/golf/scrape-url', {
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
            const addResponse = await fetch(`http://localhost:3001/api/tournaments/${tournament.id}/courses`, {
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
    Alert.alert(
      'Remove Course',
      'Are you sure you want to remove this course from the tournament?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // If this is an existing tournament, remove from backend
            if (isExisting && tournament && user && sessionToken) {
              try {
                const response = await fetch(`http://localhost:3001/api/tournaments/${tournament.id}/courses/${courseId}`, {
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
              setCourses(courses.filter(course => course.id !== courseId));
            }
          }
        }
      ]
    );
  };

  const setTeeSelection = async (courseId: string, teeIndex: number) => {
    if (!tournament || !user || !sessionToken) {
      Alert.alert('Error', 'You must be the tournament creator to set tee selections');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournament.id}/courses/${courseId}/tee`, {
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

  const startTournament = async () => {
    if (!user || !sessionToken) {
      Alert.alert('Error', 'You must be logged in to create tournaments');
      return;
    }

    if (courses.length === 0) {
      Alert.alert('Error', 'Please add at least one course to the tournament');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:3001/api/tournaments', {
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tournamentName}</Text>
        {tournament?.id ? (
          <Text style={styles.tournamentId}>Tournament ID: {tournament.id}</Text>
        ) : isExisting ? (
          <Text style={styles.tournamentId}>Tournament ID: {tournamentId}</Text>
        ) : (
          <Text style={styles.subtitle}>Add courses and start your tournament</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Courses ({courses.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCourseModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {isLoadingTournament ? (
          <View style={styles.emptyState}>
            <Text style={styles.loadingText}>Loading tournament data...</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No courses added yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first course</Text>
          </View>
        ) : (
          courses.map((course) => {
            const isCreator = tournament?.createdBy === user?.id;
            console.log('Creator check:', {
              tournamentCreatedBy: tournament?.createdBy,
              userId: user?.id,
              isCreator: isCreator,
              tournament: tournament?.name
            });
            const selectedTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;
            const selectedTee = course.tees?.[selectedTeeIndex] || course.tees?.[0];

            return (
              <View key={course.id} style={styles.courseCard}>
                {/* Main content area */}
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
                  {course.location && course.location !== 'Unknown location' && (
                    <Text style={styles.courseLocation}>{course.location}</Text>
                  )}
                  <Text style={styles.courseDetails}>
                    {course.holes.length} holes • Par {course.totalPar}
                  </Text>
                  {selectedTee && (
                    <Text style={styles.selectedTeeText}>
                      Selected Tee: {selectedTee.name}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Tee Selection Buttons are now outside the main TouchableOpacity */}
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
                            onPress={() => {
                              console.log('Tee selected:', index, tee.name);
                              setTeeSelection(course.id, index);
                            }}
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

                {/* Delete Course Button - styled like tee buttons */}
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      console.log('Delete button successfully clicked for course:', course.id);
                      removeCourse(course.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteButtonText}>Remove Course</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Player Leaderboard Section */}
      {(tournament || isExisting) && courses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Leaderboard</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.leaderboard}>
              {/* Header Row */}
              <View style={styles.leaderboardRow}>
                <View style={styles.playerNameHeader}>
                  <Text style={styles.leaderboardHeaderText}>Player</Text>
                </View>
                {courses.map((course, index) => (
                  <View key={course.id} style={styles.courseHeader}>
                    <Text style={styles.leaderboardHeaderText} numberOfLines={2}>
                      {course.name}
                    </Text>
                  </View>
                ))}
                <View style={styles.scoreHeader}>
                  <Text style={styles.leaderboardHeaderText}>Birdies</Text>
                </View>
                <View style={styles.scoreHeader}>
                  <Text style={styles.leaderboardHeaderText}>Points</Text>
                </View>
                <View style={styles.scoreHeader}>
                  <Text style={styles.leaderboardHeaderText}>To Par</Text>
                </View>
              </View>

              {/* Player Rows */}
              {tournament?.players && tournament.players.length > 0 ? tournament.players.map((player: any) => {
                // Helper function to calculate Stableford points
                const calculateStablefordPoints = (score: number | undefined, holePar: number, holeHandicap: number, courseHandicapValue: number): number => {
                  if (!score || courseHandicapValue === undefined) return 0;

                  // Calculate if player gets a stroke on this hole
                  const strokesReceived = courseHandicapValue >= holeHandicap ? 1 : 0;
                  const adjustedPar = holePar + strokesReceived;

                  // Stableford scoring:
                  const difference = score - adjustedPar;

                  if (difference <= -4) return 6; // 4+ under
                  if (difference === -3) return 5; // 3 under
                  if (difference === -2) return 4; // 2 under (Eagle)
                  if (difference === -1) return 3; // 1 under (Birdie)
                  if (difference === 0) return 2;  // Par
                  if (difference === 1) return 1;  // 1 over (Bogey)
                  return 0; // 2+ over (Double bogey or worse)
                };

                // Calculate player's scores
                const playerScores = courses.map(course => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  if (!courseScores) return null;

                  // Sum up all hole scores for this course
                  const totalScore = Object.values(courseScores).reduce((sum: number, score: any) => {
                    return sum + (typeof score === 'number' ? score : 0);
                  }, 0);
                  return totalScore;
                });

                // Calculate total birdies across all courses
                const totalBirdies = courses.reduce((birdieSum, course) => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  if (!courseScores) return birdieSum;

                  // Count birdies (score < par for each hole)
                  return birdieSum + course.holes.reduce((courseBirdies: number, hole: any, holeIndex: number) => {
                    const holeScore = courseScores[hole.number || (holeIndex + 1)];
                    const holePar = hole.par;
                    if (typeof holeScore === 'number' && holeScore < holePar) {
                      return courseBirdies + 1;
                    }
                    return courseBirdies;
                  }, 0);
                }, 0);

                // Calculate total Stableford points across all courses
                const totalStablefordPoints = courses.reduce((pointsSum, course) => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  const playerHandicap = tournament.handicaps?.[player.id]?.[course.id] || 0;
                  if (!courseScores) return pointsSum;

                  // Calculate Stableford points for each hole on this course
                  return pointsSum + course.holes.reduce((coursePoints: number, hole: any, holeIndex: number) => {
                    const holeScore = courseScores[hole.number || (holeIndex + 1)];
                    if (typeof holeScore === 'number') {
                      return coursePoints + calculateStablefordPoints(holeScore, hole.par, hole.handicap, playerHandicap);
                    }
                    return coursePoints;
                  }, 0);
                }, 0);

                // Calculate total score and par across all courses for score-to-par calculation
                let totalScore = 0;
                let totalPar = 0;
                courses.forEach(course => {
                  const courseScores = tournament.scores?.[player.id]?.[course.id];
                  if (courseScores) {
                    course.holes.forEach((hole: any, holeIndex: number) => {
                      const holeScore = courseScores[hole.number || (holeIndex + 1)];
                      if (typeof holeScore === 'number') {
                        totalScore += holeScore;
                        totalPar += hole.par;
                      }
                    });
                  }
                });

                const scoreToPar = totalScore - totalPar;
                const scoreToParText = totalScore === 0 ? '-' :
                                     scoreToPar === 0 ? 'E' :
                                     scoreToPar > 0 ? `+${scoreToPar}` :
                                     `${scoreToPar}`;

                return (
                  <View key={player.id} style={styles.leaderboardRow}>
                    <View style={styles.playerNameCell}>
                      <Text style={styles.playerNameText}>{player.username}</Text>
                    </View>
                    {playerScores.map((score, index) => {
                      const course = courses[index];
                      const selectedTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;

                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.scoreCell}
                          onPress={() => {
                            if (score !== null) {
                              // Navigate to scorecard for this player and course
                              navigation.navigate('CourseScorecard', {
                                course: course,
                                tournamentId: tournament?.id || tournamentId,
                                tournamentName: tournamentName,
                                selectedTeeIndex: selectedTeeIndex,
                                viewingPlayer: player // Pass the player we're viewing
                              });
                            }
                          }}
                          activeOpacity={score !== null ? 0.7 : 1}
                        >
                          <Text style={[
                            styles.scoreText,
                            score !== null && styles.clickableScoreText
                          ]}>
                            {score !== null ? score : '-'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={styles.scoreCell}>
                      <Text style={styles.birdieText}>{totalBirdies}</Text>
                    </View>
                    <View style={styles.scoreCell}>
                      <Text style={styles.pointsText}>{totalStablefordPoints > 0 ? totalStablefordPoints : '-'}</Text>
                    </View>
                    <View style={styles.scoreCell}>
                      <Text style={styles.toParText}>{scoreToParText}</Text>
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No players have joined yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.actions}>
        {!tournament && !isExisting && (
          <TouchableOpacity
            style={[styles.button, (courses.length === 0 || isSaving) && styles.disabledButton]}
            disabled={courses.length === 0 || isSaving}
            onPress={startTournament}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Creating Tournament...' : 'Start Tournament'}
            </Text>
          </TouchableOpacity>
        )}

        {(tournament || isExisting) && (
          <TouchableOpacity style={styles.shareButton}>
            <Text style={styles.shareButtonText}>
              Share Tournament ID: {tournament?.id || tournamentId}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Back to Edit</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showAddCourseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCourseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Course</Text>
            <Text style={styles.modalSubtitle}>Enter the name of the golf course</Text>

            <TextInput
              style={styles.urlInput}
              placeholder="e.g., Pebble Beach Golf Links, Augusta National"
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
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  tournamentId: {
    fontSize: 14,
    color: '#666',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4caf50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 15,
    position: 'relative',
  },
  courseInfo: {
    paddingRight: 40,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingLeft: 0,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
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
  teeButton: {
    backgroundColor: '#4caf50',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  teeButtonText: {
    fontSize: 14,
  },
  deleteButtonContainer: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ff4444',
    backgroundColor: '#ff4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  actions: {
    padding: 20,
    paddingTop: 10,
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 25,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2e7d32',
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
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAddText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 8,
  },
  playerNameHeader: {
    width: 100,
    paddingHorizontal: 8,
  },
  courseHeader: {
    width: 80,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    marginHorizontal: 1,
    borderRadius: 4,
    paddingVertical: 4,
  },
  scoreHeader: {
    width: 60,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  playerNameCell: {
    width: 100,
    paddingHorizontal: 8,
  },
  scoreCell: {
    width: 80,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  leaderboardHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  scoreText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  birdieText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 14,
    color: '#9c27b0',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toParText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  clickableScoreText: {
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
  teeSelectionContainer: {
    marginTop: 15,
  },
  teeSelectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  teeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teeSelectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    marginRight: 8,
    marginBottom: 8,
  },
  teeSelectionButtonSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#2e7d32',
  },
  teeSelectionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  teeSelectionButtonTextSelected: {
    color: 'white',
  },
  debugDeleteButton: {
    backgroundColor: 'red',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  debugDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});