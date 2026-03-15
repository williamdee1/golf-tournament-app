import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
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
  const [handicaps, setHandicaps] = useState<{ [playerId: string]: number }>({});
  const [editingHandicap, setEditingHandicap] = useState<string | null>(null);
  const [handicapText, setHandicapText] = useState('');

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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
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
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.tournamentName}>{tournamentName}</Text>
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
                    {totalScore > 0 && (
                      <Text style={styles.totalScore}>
                        {holesCompleted}/{holes.length} · {totalScore}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.scoreRow}>
                  <TouchableOpacity
                    style={styles.scoreBtn}
                    onPress={() => saveScore(playerId, holeNumber, Math.max(1, (currentScore ?? holePar) - 1))}
                  >
                    <Text style={styles.scoreBtnText}>−</Text>
                  </TouchableOpacity>

                  <View style={[styles.scoreDisplay, scoreInfo && { borderColor: scoreInfo.color }]}>
                    {currentScore !== undefined ? (
                      <>
                        <Text style={[styles.scoreValue, scoreInfo && { color: scoreInfo.color }]}>
                          {currentScore}
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
                    onPress={() => saveScore(playerId, holeNumber, Math.min(20, (currentScore ?? holePar) + 1))}
                  >
                    <Text style={styles.scoreBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

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
    backgroundColor: '#f4f6f4',
  },
  content: {
    paddingBottom: 40,
  },
  errorText: {
    padding: 20,
    color: '#666',
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: '#1b5e20',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: 24,
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  tournamentName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Hole Navigation
  holeNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  navButtonTextDisabled: {
    color: '#aaa',
  },
  holeInfo: {
    alignItems: 'center',
  },
  holeNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  holeTotal: {
    fontSize: 12,
    color: '#888',
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
    borderBottomColor: '#e8e8e8',
  },
  holeDetailChip: {
    alignItems: 'center',
    backgroundColor: '#f0f7f0',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 70,
  },
  holeDetailLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  holeDetailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginTop: 2,
  },

  // Progress dots
  dotsScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  dotsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: '#1b5e20',
  },
  dotComplete: {
    backgroundColor: '#4caf50',
  },
  dotText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
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
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1a2e1b',
  },
  strokesNote: {
    fontSize: 12,
    color: '#e65100',
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  handicapBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  handicapBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
  },
  totalScore: {
    fontSize: 12,
    color: '#888',
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
    borderRadius: 28,
    backgroundColor: '#1b5e20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreBtnText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: 32,
  },
  scoreDisplay: {
    width: 110,
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stablefordText: {
    fontSize: 11,
    color: '#7b1fa2',
    fontWeight: '600',
    marginTop: 2,
  },
  scorePlaceholder: {
    fontSize: 32,
    color: '#ccc',
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
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5e20',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  handicapInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#1b5e20',
    alignItems: 'center',
  },
  modalSaveText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
