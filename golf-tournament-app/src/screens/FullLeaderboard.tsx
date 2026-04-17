import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NavigationProp, RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NavigationProp<any>;
  route: RouteProp<any>;
  user?: any;
  sessionToken?: string;
};

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

export default function FullLeaderboard({ navigation, route, user }: Props) {
  const { tournament, courses, tournamentId, tournamentName } = route.params;

  if (!tournament || !courses) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const playerData = (tournament.players || []).map((player: any) => {
    const coursePoints = courses.map((course: any) => {
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
    });

    const perCourseScores = courses.map((course: any) => {
      const courseScores = tournament.scores?.[player.id]?.[course.id];
      if (!courseScores) return null;
      return Object.values(courseScores).reduce((sum: number, score: any) => {
        return sum + (typeof score === 'number' ? score : 0);
      }, 0);
    });

    const filledPoints = coursePoints.filter((p: number | null) => p !== null) as number[];
    const top3 = [...filledPoints].sort((a: number, b: number) => b - a).slice(0, 3);
    const top3Avg = top3.length > 0 ? top3.reduce((s: number, v: number) => s + v, 0) / top3.length : 0;
    const totalPoints = filledPoints.reduce((s: number, v: number) => s + v, 0);

    const totalBirdies = courses.reduce((birdieSum: number, course: any) => {
      const courseScores = tournament.scores?.[player.id]?.[course.id];
      if (!courseScores) return birdieSum;
      return birdieSum + course.holes.reduce((b: number, hole: any, holeIndex: number) => {
        const holeScore = courseScores[hole.number || (holeIndex + 1)];
        return (typeof holeScore === 'number' && holeScore < hole.par) ? b + 1 : b;
      }, 0);
    }, 0);

    let totalScore = 0;
    let totalPar = 0;
    courses.forEach((course: any) => {
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

    return { player, coursePoints, perCourseScores, top3Avg, totalPoints, totalBirdies, scoreToParText };
  });

  playerData.sort((a: any, b: any) => b.top3Avg - a.top3Avg);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tournamentName}</Text>
        <Text style={styles.subtitle}>Full Leaderboard</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.section}>
          {/* Top 3 Avg Summary */}
          <Text style={styles.sectionLabel}>RANKINGS — TOP 3 COURSE AVG</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.headerText, { width: 28 }]}>#</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>Player</Text>
              <Text style={[styles.headerText, { width: 72, textAlign: 'center' }]}>Top 3 Avg</Text>
              <Text style={[styles.headerText, { width: 60, textAlign: 'center' }]}>Birdies</Text>
              <Text style={[styles.headerText, { width: 60, textAlign: 'center' }]}>To Par</Text>
            </View>
            {playerData.map(({ player, top3Avg, totalBirdies, scoreToParText }: any, index: number) => (
              <View key={player.id} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                <Text style={[styles.rankText, { width: 28 }]}>{index + 1}</Text>
                <Text style={[styles.playerText, { flex: 1 }]}>{player.username}</Text>
                <Text style={[styles.pointsText, { width: 72, textAlign: 'center' }]}>
                  {top3Avg > 0 ? top3Avg.toFixed(1) : '-'}
                </Text>
                <Text style={[styles.birdieText, { width: 60, textAlign: 'center' }]}>{totalBirdies}</Text>
                <Text style={[styles.toParText, { width: 60, textAlign: 'center' }]}>{scoreToParText}</Text>
              </View>
            ))}
          </View>

          {/* Per Course Stableford Points */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>STABLEFORD POINTS PER COURSE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.headerText, { width: 120 }]}>Player</Text>
                {courses.map((course: any) => (
                  <Text key={course.id} style={[styles.headerText, { width: 90, textAlign: 'center' }]} numberOfLines={2}>
                    {course.name}
                  </Text>
                ))}
                <Text style={[styles.headerText, { width: 72, textAlign: 'center' }]}>Total</Text>
              </View>
              {playerData.map(({ player, coursePoints, totalPoints }: any, index: number) => (
                <View key={player.id} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.playerText, { width: 120 }]}>{player.username}</Text>
                  {coursePoints.map((pts: number | null, i: number) => (
                    <Text key={i} style={[styles.coursePointText, { width: 90, textAlign: 'center' }]}>
                      {pts !== null ? pts : '-'}
                    </Text>
                  ))}
                  <Text style={[styles.pointsText, { width: 72, textAlign: 'center' }]}>
                    {totalPoints > 0 ? totalPoints : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Per Course Gross Scores */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>GROSS SCORES PER COURSE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.headerText, { width: 120 }]}>Player</Text>
                {courses.map((course: any) => (
                  <Text key={course.id} style={[styles.headerText, { width: 90, textAlign: 'center' }]} numberOfLines={2}>
                    {course.name}
                  </Text>
                ))}
                <Text style={[styles.headerText, { width: 72, textAlign: 'center' }]}>To Par</Text>
              </View>
              {playerData.map(({ player, perCourseScores, scoreToParText }: any, index: number) => (
                <View key={player.id} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.playerText, { width: 120 }]}>{player.username}</Text>
                  {perCourseScores.map((score: number | null, i: number) => {
                    const course = courses[i];
                    const selectedTeeIndex = tournament?.courseSettings?.[course.id]?.selectedTeeIndex || 0;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={{ width: 90, alignItems: 'center' }}
                        onPress={() => {
                          if (score !== null) {
                            navigation.navigate('CourseScorecard', {
                              course,
                              tournamentId: tournament?.id || tournamentId,
                              tournamentName,
                              selectedTeeIndex,
                              viewingPlayer: player,
                            });
                          }
                        }}
                        activeOpacity={score !== null ? 0.7 : 1}
                      >
                        <Text style={[styles.grossScoreText, score !== null && styles.clickableText]}>
                          {score !== null ? score : '-'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <Text style={[styles.toParText, { width: 72, textAlign: 'center' }]}>{scoreToParText}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f3f0',
  },
  header: {
    backgroundColor: '#062612',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2.5,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 4,
  },
  headerRow: {
    backgroundColor: '#062612',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowAlt: {
    backgroundColor: '#f7f9f7',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  rankText: {
    fontSize: 13,
    color: '#bbb',
    fontWeight: '500',
  },
  playerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1b',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#064E3B',
  },
  birdieText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e64a19',
  },
  toParText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d9e5f',
  },
  coursePointText: {
    fontSize: 14,
    color: '#555',
  },
  grossScoreText: {
    fontSize: 14,
    color: '#555',
    paddingVertical: 12,
  },
  clickableText: {
    color: '#1565c0',
    textDecorationLine: 'underline',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#aaa',
  },
});
