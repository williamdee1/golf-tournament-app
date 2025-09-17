import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
  user?: any;
  sessionToken?: string;
};

type Hole = {
  number: number;
  par: number;
  handicap: number;
  yardage?: { [key: string]: number };
};

export default function CourseScorecard({ navigation, route, user, sessionToken }: Props) {
  const { course, tournamentId, tournamentName, selectedTeeIndex = 0, viewingPlayer } = route.params;

  // Determine which player's scorecard we're viewing
  const currentPlayer = viewingPlayer || user;
  const isViewingOwnScorecard = !viewingPlayer || viewingPlayer.id === user?.id;
  const [scores, setScores] = useState<{ [key: number]: number }>({});
  const [courseHandicap, setCourseHandicap] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!course) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Course not found</Text>
        </View>
      </View>
    );
  }

  const tee = course.tees?.[selectedTeeIndex] || course.tees?.[0];

  // Load existing scores on component mount
  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    if (!tournamentId || !currentPlayer || !sessionToken) return;

    try {
      const response = await fetch(API_ENDPOINTS.tournamentDetail(tournamentId), {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const playerScores = data.tournament.scores?.[currentPlayer.id]?.[course.id] || {};
        setScores(playerScores);

        // Load course handicap
        const playerCourseHandicap = data.tournament.handicaps?.[currentPlayer.id]?.[course.id];
        if (playerCourseHandicap !== undefined) {
          setCourseHandicap(playerCourseHandicap.toString());
        }
      }
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  };

  const saveScore = async (holeNumber: number, score: number) => {
    if (!tournamentId || !user || !sessionToken) {
      Alert.alert('Error', 'You must be logged in to save scores');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.saveScore(tournamentId, course.id, holeNumber), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      const data = await response.json();

      if (data.success) {
        setScores(prev => ({ ...prev, [holeNumber]: score }));
      } else {
        Alert.alert('Error', data.error || 'Failed to save score');
      }
    } catch (error) {
      console.error('Save score error:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCourseHandicap = async (handicap: number) => {
    if (!tournamentId || !user || !sessionToken) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.saveHandicap(tournamentId, course.id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseHandicap: handicap }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('Failed to save course handicap:', data.error);
      } else {
        console.log('Course handicap saved successfully:', handicap);
      }
    } catch (error) {
      console.error('Save course handicap error:', error);
    }
  };

  const handleScoreChange = (holeNumber: number, scoreText: string) => {
    console.log('Score change:', holeNumber, scoreText);
    const score = parseInt(scoreText);
    if (!isNaN(score) && score >= 1 && score <= 20) {
      console.log('Saving score:', holeNumber, score);
      saveScore(holeNumber, score);
    } else if (scoreText === '') {
      // Allow empty input for editing
      console.log('Clearing score for hole:', holeNumber);
      setScores(prev => {
        const newScores = { ...prev };
        delete newScores[holeNumber];
        return newScores;
      });
    } else {
      console.log('Invalid score:', scoreText);
    }
  };

  const handleHandicapChange = (handicapText: string) => {
    setCourseHandicap(handicapText);

    const handicap = parseInt(handicapText);
    if (!isNaN(handicap) && handicap >= 0 && handicap <= 54) {
      console.log('Saving course handicap:', handicap);
      saveCourseHandicap(handicap);
    }
  };

  const calculateStablefordPoints = (score: number | undefined, holePar: number, holeHandicap: number, courseHandicapValue: number): number => {
    if (!score || courseHandicapValue === undefined) return 0;

    // Calculate if player gets a stroke on this hole
    const strokesReceived = courseHandicapValue >= holeHandicap ? 1 : 0;
    const adjustedPar = holePar + strokesReceived;

    // Stableford scoring:
    // 4+ under adjusted par = 6 points
    // 3 under adjusted par = 5 points
    // 2 under adjusted par = 4 points
    // 1 under adjusted par = 3 points
    // Adjusted par = 2 points
    // 1 over adjusted par = 1 point
    // 2+ over adjusted par = 0 points
    const difference = score - adjustedPar;

    if (difference <= -4) return 6; // 4+ under
    if (difference === -3) return 5; // 3 under
    if (difference === -2) return 4; // 2 under (Eagle)
    if (difference === -1) return 3; // 1 under (Birdie)
    if (difference === 0) return 2;  // Par
    if (difference === 1) return 1;  // 1 over (Bogey)
    return 0; // 2+ over (Double bogey or worse)
  };

  const getScoreColors = (score: number | undefined, holePar: number) => {
    if (!score) return { backgroundColor: '#fff', textColor: '#333' };

    const scoreToPar = score - holePar;

    if (scoreToPar <= -2) {
      // Eagle or better - Purple
      return { backgroundColor: '#7B1FA2', textColor: '#fff' };
    } else if (scoreToPar === -1) {
      // Birdie - Red
      return { backgroundColor: '#D32F2F', textColor: '#fff' };
    } else if (scoreToPar === 0) {
      // Par - Default
      return { backgroundColor: '#fff', textColor: '#333' };
    } else if (scoreToPar === 1) {
      // Bogey - Blue
      return { backgroundColor: '#1976D2', textColor: '#fff' };
    } else {
      // Double bogey or worse - Dark Blue
      return { backgroundColor: '#0D47A1', textColor: '#fff' };
    }
  };

  const renderHoles = (holes: Hole[], startIndex: number = 0) => {
    const courseHandicapValue = parseInt(courseHandicap) || 0;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.holesContainer}>
          {holes.map((hole, index) => {
            const holeNumber = hole.number || (startIndex + index + 1);
            const userScore = scores[holeNumber];
            const teeHole = tee?.holes?.[startIndex + index];
            const stablefordPoints = calculateStablefordPoints(userScore, hole.par, hole.handicap, courseHandicapValue);
            const scoreColors = getScoreColors(userScore, hole.par);

            return (
              <View key={holeNumber} style={styles.holeCard}>
                <Text style={styles.holeNumberText}>{holeNumber}</Text>
                <Text style={styles.holeLabel}>Hole</Text>

                <Text style={styles.parText}>{hole.par}</Text>
                <Text style={styles.holeLabel}>Par</Text>

                <Text style={styles.hcpText}>{hole.handicap || '-'}</Text>
                <Text style={styles.holeLabel}>HCP</Text>

                {teeHole?.yardage && (
                  <>
                    <Text style={styles.yardageText}>{teeHole.yardage}</Text>
                    <Text style={styles.holeLabel}>Yds</Text>
                  </>
                )}

                {isViewingOwnScorecard ? (
                  <TextInput
                    style={[
                      styles.scoreInput,
                      userScore && styles.scoreInputFilled,
                      userScore && {
                        backgroundColor: scoreColors.backgroundColor,
                        color: scoreColors.textColor,
                        borderColor: scoreColors.backgroundColor
                      }
                    ]}
                    value={userScore ? userScore.toString() : ''}
                    onChangeText={(text) => handleScoreChange(holeNumber, text)}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="-"
                    placeholderTextColor="#ccc"
                    returnKeyType="done"
                    selectTextOnFocus={true}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                ) : (
                  <View style={[
                    styles.scoreInput,
                    userScore && styles.scoreInputFilled,
                    styles.readOnlyScore,
                    userScore && {
                      backgroundColor: scoreColors.backgroundColor,
                      borderColor: scoreColors.backgroundColor
                    }
                  ]}>
                    <Text style={[
                      styles.scoreText,
                      userScore && { color: scoreColors.textColor }
                    ]}>
                      {userScore ? userScore.toString() : '-'}
                    </Text>
                  </View>
                )}
                <Text style={styles.holeLabel}>Score</Text>

                <Text style={[styles.stablefordText, stablefordPoints > 0 && styles.stablefordTextFilled]}>
                  {userScore && courseHandicapValue ? stablefordPoints : '-'}
                </Text>
                <Text style={styles.holeLabel}>Points</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{course.name}</Text>
            {course.location && course.location !== 'Unknown location' && (
              <Text style={styles.location}>{course.location}</Text>
            )}
            <Text style={styles.tournamentInfo}>
              Tournament: {tournamentName}
            </Text>
            {!isViewingOwnScorecard && (
              <Text style={styles.playerInfo}>
                Viewing: {currentPlayer.username}'s scorecard
              </Text>
            )}
            {tee && (
              <Text style={styles.teeInfo}>
                Playing from: {tee.name}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.handicapLabel}>Course Handicap</Text>
            {isViewingOwnScorecard ? (
              <TextInput
                style={styles.handicapInput}
                value={courseHandicap}
                onChangeText={handleHandicapChange}
                keyboardType="numeric"
                maxLength={2}
                placeholder="0"
                placeholderTextColor="#ccc"
                returnKeyType="done"
                selectTextOnFocus={true}
                autoCorrect={false}
                autoCapitalize="none"
              />
            ) : (
              <View style={[styles.handicapInput, styles.readOnlyHandicap]}>
                <Text style={styles.handicapText}>
                  {courseHandicap || '0'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Course Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Par</Text>
          <Text style={styles.summaryValue}>{course.totalPar}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Your Score</Text>
          <Text style={styles.summaryValue}>
            {(() => {
              const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
              if (totalScore === 0) return '-';

              // Calculate par for holes with scores
              const parForScoredHoles = course.holes?.reduce((parSum, hole, index) => {
                const holeNumber = hole.number || (index + 1);
                if (scores[holeNumber]) {
                  return parSum + hole.par;
                }
                return parSum;
              }, 0) || 0;

              const scoreToPar = totalScore - parForScoredHoles;
              const scoreToParText = scoreToPar === 0 ? '(E)' :
                                   scoreToPar > 0 ? `(+${scoreToPar})` :
                                   `(${scoreToPar})`;

              return `${totalScore} ${scoreToParText}`;
            })()}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Stableford Points</Text>
          <Text style={styles.summaryValue}>
            {courseHandicap && Object.keys(scores).length > 0 ?
              course.holes?.reduce((total, hole, index) => {
                const holeNumber = hole.number || (index + 1);
                const userScore = scores[holeNumber];
                return total + calculateStablefordPoints(userScore, hole.par, hole.handicap, parseInt(courseHandicap));
              }, 0) || '-' : '-'}
          </Text>
        </View>
      </View>

      {/* Front 9 */}
      <View style={styles.nineSection}>
        <Text style={styles.nineTitle}>Front 9</Text>
        {renderHoles(course.holes?.slice(0, 9) || [], 0)}
      </View>

      {/* Back 9 */}
      {course.holes?.length > 9 && (
        <View style={styles.nineSection}>
          <Text style={styles.nineTitle}>Back 9</Text>
          {renderHoles(course.holes.slice(9, 18), 9)}
        </View>
      )}

      {/* Action Button */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Tournament</Text>
        </TouchableOpacity>
      </View>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'center',
    marginLeft: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  tournamentInfo: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  teeInfo: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  handicapLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  handicapInput: {
    borderWidth: 2,
    borderColor: '#2e7d32',
    borderRadius: 8,
    width: 60,
    height: 50,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    color: '#2e7d32',
  },
  readOnlyScore: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyHandicap: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  handicapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  nineSection: {
    padding: 20,
    paddingTop: 15,
  },
  nineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 15,
    textAlign: 'center',
  },
  holesContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  holeCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  holeNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 2,
  },
  parText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  hcpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  yardageText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  holeLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  scoreInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    width: 40,
    height: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    marginBottom: 2,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  scoreInputFilled: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
  },
  stablefordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  stablefordTextFilled: {
    color: '#ff6b35',
  },
  actions: {
    padding: 20,
  },
  backButton: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});