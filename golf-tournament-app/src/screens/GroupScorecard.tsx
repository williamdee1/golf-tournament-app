import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Platform } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: any;
  route: { params: any };
  user?: any;
  sessionToken?: string;
};

export default function GroupScorecard({ navigation, route, user, sessionToken }: Props) {
  const { scorecard, course, tournamentId, tournamentName, selectedTeeIndex } = route.params;

  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [scores, setScores] = useState<{ [playerId: string]: { [hole: number]: number } }>({});
  const [pickups, setPickups] = useState<{ [playerId: string]: { [hole: number]: boolean } }>({});
  const [handicaps, setHandicaps] = useState<{ [playerId: string]: number }>({});
  const [editingHandicap, setEditingHandicap] = useState<string | null>(null);
  const [handicapText, setHandicapText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(scorecard.submitted || false);
  const longPressTimers = useRef<{ [playerId: string]: ReturnType<typeof setTimeout> }>({});
  const longPressFired = useRef<{ [playerId: string]: boolean }>({});

  const holes = course.holes || [];
  const currentHole = holes[currentHoleIndex];
  const tee = course.tees?.[selectedTeeIndex || 0] || course.tees?.[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.tournamentDetail(tournamentId), {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      if (data.success && data.tournament) {
        const t = data.tournament;
        const newScores: any = {};
        const newHandicaps: any = {};
        for (const playerId of scorecard.playerIds) {
          newScores[playerId] = t.scores?.[playerId]?.[course.id] || {};
          const h = t.handicaps?.[playerId]?.[course.id];
          if (h !== undefined) newHandicaps[playerId] = h;
        }
        setScores(newScores);
        setHandicaps(newHandicaps);

        // Jump to the next unscored hole on load
        const allScores = newScores;
        const firstUnscored = holes.findIndex((_: any, i: number) => {
          const hNum = holes[i].number || (i + 1);
          return scorecard.playerIds.some((pid: string) =>
            allScores[pid]?.[hNum] === undefined || allScores[pid]?.[hNum] === 0
          );
        });
        if (firstUnscored === -1) {
          setCurrentHoleIndex(holes.length - 1); // all scored — show last hole
        } else if (firstUnscored > 0) {
          setCurrentHoleIndex(firstUnscored);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // "Pick up" — minimum score that scores 0 Stableford points
  const getPickupScore = (par: number, playerId: string, holeSI: number): number => {
    const h = handicaps[playerId] ?? 0;
    const strokes = Math.floor(h / 18) + (holeSI <= (h % 18) ? 1 : 0);
    return par + strokes + 2; // double bogey net = 0 pts
  };

  const handlePlusPress = (playerId: string, currentScore: number | undefined, holePar: number, holeNumber: number) => {
    if (longPressFired.current[playerId]) {
      longPressFired.current[playerId] = false;
      return;
    }
    // First press with no score → go to par, not bogey
    const next = currentScore === undefined ? holePar : Math.min(20, currentScore + 1);
    saveScore(playerId, holeNumber, next);
  };

  const handlePlusPressIn = (playerId: string, holePar: number, holeSI: number, holeNumber: number) => {
    longPressFired.current[playerId] = false;
    longPressTimers.current[playerId] = setTimeout(() => {
      longPressFired.current[playerId] = true;
      const pickup = getPickupScore(holePar, playerId, holeSI);
      setPickups(prev => ({
        ...prev,
        [playerId]: { ...(prev[playerId] || {}), [holeNumber]: true }
      }));
      saveScore(playerId, holeNumber, pickup);
    }, 600);
  };

  const handlePlusPressOut = (playerId: string) => {
    clearTimeout(longPressTimers.current[playerId]);
  };

  const saveScore = async (playerId: string, holeNumber: number, score: number) => {
    setScores(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] || {}), [holeNumber]: score }
    }));
    try {
      await fetch(API_ENDPOINTS.saveScore(tournamentId, course.id, holeNumber), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ score, targetPlayerId: playerId })
      });
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const saveHandicap = async (playerId: string, handicap: number) => {
    setHandicaps(prev => ({ ...prev, [playerId]: handicap }));
    try {
      await fetch(API_ENDPOINTS.saveHandicap(tournamentId, course.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ courseHandicap: handicap, targetPlayerId: playerId })
      });
    } catch (error) {
      console.error('Error saving handicap:', error);
    }
  };

  const confirmAction = (message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) onConfirm();
    } else {
      Alert.alert('Confirm', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ]);
    }
  };

  const handleSubmitScorecard = () => {
    confirmAction(
      'Submit this scorecard? Scores will be locked but you can re-open to edit if needed.',
      async () => {
        setIsSubmitting(true);
        try {
          const response = await fetch(API_ENDPOINTS.submitScorecard(tournamentId, scorecard.id), {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          });
          const data = await response.json();
          if (data.success) setSubmitted(true);
        } catch (error) {
          console.error('Error submitting scorecard:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleUnsubmit = () => {
    confirmAction(
      'Re-open this scorecard so scores can be edited?',
      async () => {
        setIsSubmitting(true);
        try {
          const response = await fetch(API_ENDPOINTS.unsubmitScorecard(tournamentId, scorecard.id), {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          });
          const data = await response.json();
          if (data.success) setSubmitted(false);
        } catch (error) {
          console.error('Error re-opening scorecard:', error);
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const getStrokesReceived = (playerId: string, holeSI: number): number => {
    const h = handicaps[playerId] ?? 0;
    return Math.floor(h / 18) + (holeSI <= (h % 18) ? 1 : 0);
  };

  const getScoreInfo = (score: number, par: number, diff: number) => {
    if (diff <= -2) return { label: 'Eagle', color: '#7b1fa2' };
    if (diff === -1) return { label: 'Birdie', color: '#c62828' };
    if (diff === 0) return { label: 'Par', color: '#2e7d32' };
    if (diff === 1) return { label: 'Bogey', color: '#1565c0' };
    return { label: `+${diff}`, color: '#0d47a1' };
  };

  const calculateStableford = (score: number, par: number, playerId: string, holeSI: number): number => {
    const h = handicaps[playerId] ?? 0;
    const strokes = Math.floor(h / 18) + (holeSI <= (h % 18) ? 1 : 0);
    const diff = score - (par + strokes);
    if (diff <= -4) return 6;
    if (diff === -3) return 5;
    if (diff === -2) return 4;
    if (diff === -1) return 3;
    if (diff === 0) return 2;
    if (diff === 1) return 1;
    return 0;
  };

  const getTotalScore = (playerId: string): number => {
    return Object.values(scores[playerId] || {}).reduce((sum: number, s: any) =>
      sum + (typeof s === 'number' ? s : 0), 0);
  };

  const getHolesCompleted = (playerId: string): number => {
    return Object.values(scores[playerId] || {}).filter(s => typeof s === 'number' && s > 0).length;
  };

  const getTotalStableford = (playerId: string): number => {
    return holes.reduce((total: number, hole: any) => {
      const hNum = hole.number || (holes.indexOf(hole) + 1);
      const s = scores[playerId]?.[hNum];
      if (typeof s !== 'number') return total;
      return total + calculateStableford(s, hole.par, playerId, hole.handicap || 0);
    }, 0);
  };

  if (!currentHole) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No hole data available for this course.</Text>
      </View>
    );
  }

  const holeNumber = currentHole.number || (currentHoleIndex + 1);
  const holePar = currentHole.par;
  const holeSI = currentHole.handicap || 0;
  const holeYardage = tee?.holes?.[currentHoleIndex]?.yards || currentHole.yards || currentHole.yardage;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerBottomRow}>
            <View style={styles.courseNameBlock}>
              <Text style={styles.courseName}>{course.name}</Text>
              <Text style={styles.tournamentName}>{tournamentName}</Text>
            </View>
            <TouchableOpacity
              style={styles.leaderboardBtn}
              onPress={() => navigation.navigate('RoundLeaderboard', { tournamentId, course, tournamentName })}
              // @ts-ignore — web-only hover handled via onMouseEnter/Leave
              onMouseEnter={(e: any) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,1)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            >
              <Text style={styles.leaderboardBtnText}>ROUND</Text>
              <Text style={styles.leaderboardBtnText}>LEADERBOARD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hole Navigation */}
        <View style={styles.holeNav}>
          <TouchableOpacity
            style={[styles.navButton, currentHoleIndex === 0 && styles.navButtonDisabled]}
            onPress={() => setCurrentHoleIndex(i => Math.max(0, i - 1))}
            disabled={currentHoleIndex === 0}
          >
            <Text style={[styles.navButtonText, currentHoleIndex === 0 && styles.navButtonTextDisabled]}>← Prev</Text>
          </TouchableOpacity>

          <View style={styles.holeInfo}>
            <Text style={styles.holeNumber}>Hole {holeNumber}</Text>
            <Text style={styles.holeTotal}>of {holes.length}</Text>
          </View>

          <TouchableOpacity
            style={[styles.navButton, currentHoleIndex === holes.length - 1 && styles.navButtonDisabled]}
            onPress={() => setCurrentHoleIndex(i => Math.min(holes.length - 1, i + 1))}
            disabled={currentHoleIndex === holes.length - 1}
          >
            <Text style={[styles.navButtonText, currentHoleIndex === holes.length - 1 && styles.navButtonTextDisabled]}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Hole Details */}
        <View style={styles.holeDetails}>
          <View style={styles.holeDetailChip}>
            <Text style={styles.holeDetailLabel}>PAR</Text>
            <Text style={styles.holeDetailValue}>{holePar}</Text>
          </View>
          {holeSI > 0 && (
            <View style={styles.holeDetailChip}>
              <Text style={styles.holeDetailLabel}>SI</Text>
              <Text style={styles.holeDetailValue}>{holeSI}</Text>
            </View>
          )}
          {holeYardage && (
            <View style={styles.holeDetailChip}>
              <Text style={styles.holeDetailLabel}>YARDS</Text>
              <Text style={styles.holeDetailValue}>{holeYardage}</Text>
            </View>
          )}
        </View>

        {/* Progress Dots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dotsScroll}>
          <View style={styles.dotsRow}>
            {holes.map((_: any, i: number) => {
              const h = holes[i];
              const hNum = h.number || (i + 1);
              const allScored = scorecard.playerIds.every((pid: string) => scores[pid]?.[hNum] !== undefined && scores[pid]?.[hNum] > 0);
              return (
                <TouchableOpacity key={i} onPress={() => setCurrentHoleIndex(i)}>
                  <View style={[
                    styles.dot,
                    i === currentHoleIndex && styles.dotActive,
                    allScored && i !== currentHoleIndex && styles.dotComplete
                  ]}>
                    <Text style={[styles.dotText, (i === currentHoleIndex || allScored) && styles.dotTextActive]}>
                      {i + 1}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Submitted Banner */}
        {submitted && (
          <View style={styles.submittedBanner}>
            <Text style={styles.submittedCheck}>✓</Text>
            <View>
              <Text style={styles.submittedBannerTitle}>Scorecard Submitted</Text>
              <Text style={styles.submittedBannerSub}>Scores are locked</Text>
            </View>
          </View>
        )}

        {/* Player Cards */}
        <View style={styles.playersSection}>
          {scorecard.playerIds.map((playerId: string) => {
            const playerName = scorecard.playerNames[playerId] || 'Player';
            const currentScore = scores[playerId]?.[holeNumber];
            const handicap = handicaps[playerId];
            const strokesReceived = handicap !== undefined && holeSI > 0 ? getStrokesReceived(playerId, holeSI) : 0;
            const scoreDiff = currentScore !== undefined ? currentScore - holePar : null;
            const scoreInfo = scoreDiff !== null ? getScoreInfo(currentScore!, holePar, scoreDiff) : null;
            const stablefordPts = currentScore !== undefined ? calculateStableford(currentScore, holePar, playerId, holeSI) : null;
            const totalScore = getTotalScore(playerId);
            const holesCompleted = getHolesCompleted(playerId);
            const totalStableford = getTotalStableford(playerId);

            return (
              <View key={playerId} style={styles.playerCard}>
                <View style={styles.playerCardTop}>
                  <View style={styles.playerMeta}>
                    <Text style={styles.playerName}>{playerName}</Text>
                    {strokesReceived > 0 && (
                      <Text style={styles.strokesNote}>+{strokesReceived} stroke{strokesReceived > 1 ? 's' : ''} this hole</Text>
                    )}
                  </View>
                  <View style={styles.playerStats}>
                    <TouchableOpacity
                      style={styles.handicapBadge}
                      onPress={() => {
                        setEditingHandicap(playerId);
                        setHandicapText(handicap !== undefined ? String(handicap) : '');
                      }}
                    >
                      <Text style={styles.handicapBadgeText}>
                        {handicap !== undefined ? `HCP ${handicap}` : 'Set HCP'}
                      </Text>
                    </TouchableOpacity>
                    {holesCompleted > 0 && (
                      <Text style={styles.totalScore}>
                        {holesCompleted}/{holes.length} · {totalScore}
                      </Text>
                    )}
                  </View>
                </View>

                {submitted ? (
                  <View style={styles.scoreRowReadOnly}>
                    <View style={[styles.scoreDisplay, scoreInfo && { borderColor: scoreInfo.color }]}>
                      {currentScore !== undefined ? (
                        <>
                          <Text style={[styles.scoreValue, scoreInfo && { color: scoreInfo.color }]}>
                            {currentScore}{pickups[playerId]?.[holeNumber] ? '*' : ''}
                          </Text>
                          <Text style={[styles.scoreLabel, { color: scoreInfo?.color || '#666' }]}>
                            {scoreInfo?.label}
                          </Text>
                          {stablefordPts !== null && (
                            <Text style={styles.stablefordText}>{stablefordPts} pts</Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.scorePlaceholder}>-</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.scoreRow}>
                    <TouchableOpacity
                      style={styles.scoreBtn}
                      onPress={() => {
                        setPickups(prev => {
                          const updated = { ...prev };
                          if (updated[playerId]) {
                            updated[playerId] = { ...updated[playerId], [holeNumber]: false };
                          }
                          return updated;
                        });
                        saveScore(playerId, holeNumber, Math.max(1, (currentScore ?? holePar) - 1));
                      }}
                    >
                      <Text style={styles.scoreBtnText}>−</Text>
                    </TouchableOpacity>

                    <View style={[styles.scoreDisplay, scoreInfo && { borderColor: scoreInfo.color }]}>
                      {currentScore !== undefined ? (
                        <>
                          <Text style={[styles.scoreValue, scoreInfo && { color: scoreInfo.color }]}>
                            {currentScore}{pickups[playerId]?.[holeNumber] ? '*' : ''}
                          </Text>
                          <Text style={[styles.scoreLabel, { color: scoreInfo?.color || '#666' }]}>
                            {scoreInfo?.label}
                          </Text>
                          {stablefordPts !== null && (
                            <Text style={styles.stablefordText}>{stablefordPts} pts</Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.scorePlaceholder}>-</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.scoreBtn}
                      onPress={() => handlePlusPress(playerId, currentScore, holePar, holeNumber)}
                      onPressIn={() => handlePlusPressIn(playerId, holePar, holeSI, holeNumber)}
                      onPressOut={() => handlePlusPressOut(playerId)}
                    >
                      <Text style={styles.scoreBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {totalStableford > 0 && (
                  <View style={styles.stablefordBadgeRow}>
                    <View style={styles.stablefordBadge}>
                      <Text style={styles.stablefordBadgeText}>{totalStableford} pts</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Submit / Edit Scorecard — creator only */}
        {scorecard.createdBy === user?.id && (
          <View style={styles.submitSection}>
            {submitted ? (
              <TouchableOpacity
                style={[styles.editButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleUnsubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.editButtonText}>
                  {isSubmitting ? 'Updating...' : '✏️  Edit Scores'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitScorecard}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Scorecard'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      {/* Handicap Modal */}
      <Modal
        visible={editingHandicap !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingHandicap(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Course Handicap
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingHandicap ? scorecard.playerNames[editingHandicap] : ''}
            </Text>
            <TextInput
              style={styles.handicapInput}
              value={handicapText}
              onChangeText={setHandicapText}
              keyboardType="numeric"
              placeholder="0–54"
              maxLength={2}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingHandicap(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  const val = parseInt(handicapText);
                  if (!isNaN(val) && val >= 0 && val <= 54 && editingHandicap) {
                    saveHandicap(editingHandicap, val);
                  }
                  setEditingHandicap(null);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f3f0',
  },
  content: {
    paddingBottom: 40,
  },
  errorText: {
    padding: 20,
    color: '#aaa',
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: '#062612',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseNameBlock: {
    flex: 1,
    marginRight: 12,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  leaderboardBtn: {
    backgroundColor: 'transparent',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  leaderboardBtnText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  courseName: {
    fontSize: 22,
    fontWeight: '300',
    color: 'white',
    letterSpacing: -0.3,
  },
  tournamentName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Hole Navigation
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2d9e5f',
    borderRadius: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#ebebeb',
  },
  navButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  navButtonTextDisabled: {
    color: '#bbb',
  },
  holeInfo: {
    alignItems: 'center',
  },
  holeNumber: {
    fontSize: 20,
    fontWeight: '300',
    color: '#062612',
    letterSpacing: -0.3,
  },
  holeTotal: {
    fontSize: 11,
    color: '#bbb',
  },

  // Hole Details chips
  holeDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  holeDetailChip: {
    alignItems: 'center',
    backgroundColor: '#f0f4f0',
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 70,
  },
  holeDetailLabel: {
    fontSize: 9,
    color: '#aaa',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  holeDetailValue: {
    fontSize: 20,
    fontWeight: '400',
    color: '#062612',
    marginTop: 2,
  },

  // Progress dots
  dotsScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dotsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#ebebeb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: '#062612',
  },
  dotComplete: {
    backgroundColor: '#2d9e5f',
  },
  dotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#bbb',
  },
  dotTextActive: {
    color: 'white',
  },

  // Player Cards
  playersSection: {
    padding: 12,
    gap: 10,
  },
  playerCard: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  playerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2e1b',
  },
  strokesNote: {
    fontSize: 11,
    color: '#e65100',
    marginTop: 3,
  },
  playerStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  handicapBadge: {
    backgroundColor: 'rgba(45,158,95,0.08)',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(45,158,95,0.2)',
  },
  handicapBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2d9e5f',
    letterSpacing: 0.3,
  },
  totalScore: {
    fontSize: 11,
    color: '#bbb',
  },
  totalStableford: {
    fontSize: 11,
    color: '#7b1fa2',
    fontWeight: '600',
  },
  stablefordBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  stablefordBadge: {
    backgroundColor: 'rgba(123,31,162,0.08)',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(123,31,162,0.2)',
  },
  stablefordBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7b1fa2',
    letterSpacing: 0.3,
  },

  // Score controls
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scoreBtn: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#2d9e5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnText: {
    fontSize: 28,
    fontWeight: '300',
    color: 'white',
    lineHeight: 32,
  },
  scoreDisplay: {
    width: 110,
    minHeight: 80,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '300',
    color: '#1a1a1a',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  stablefordText: {
    fontSize: 11,
    color: '#7b1fa2',
    fontWeight: '600',
    marginTop: 2,
  },
  scorePlaceholder: {
    fontSize: 32,
    color: '#ddd',
  },

  // Score row (read-only when submitted)
  scoreRowReadOnly: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },

  // Submit / edit section
  submittedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062612',
    margin: 12,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 14,
  },
  submittedCheck: {
    fontSize: 22,
    color: '#2d9e5f',
    fontWeight: 'bold',
  },
  submittedBannerTitle: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  submittedBannerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  submitSection: {
    padding: 16,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: '#2d9e5f',
    borderRadius: 4,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(45,158,95,0.25)',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  editButton: {
    borderRadius: 4,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d9e5f',
    backgroundColor: 'transparent',
  },
  editButtonText: {
    color: '#2d9e5f',
    fontWeight: '600',
    fontSize: 14,
  },

  // Handicap Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#062612',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  handicapInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 14,
    fontSize: 24,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#aaa',
    fontWeight: '500',
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 1,
    padding: 13,
    borderRadius: 4,
    backgroundColor: '#2d9e5f',
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
