import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: any;
  route: { params: any };
  user?: any;
  sessionToken?: string;
};

const calculateStableford = (score: number, par: number, holeSI: number, courseHandicap: number): number => {
  const strokes = Math.floor(courseHandicap / 18) + (holeSI <= (courseHandicap % 18) ? 1 : 0);
  const diff = score - (par + strokes);
  if (diff <= -4) return 6;
  if (diff === -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
};

export default function RoundLeaderboard({ navigation, route, sessionToken }: Props) {
  const { tournamentId, course, tournamentName } = route.params;
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ENDPOINTS.tournamentDetail(tournamentId), {
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    })
      .then(r => r.json())
      .then(data => { if (data.success) setTournament(data.tournament); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const playerData = (tournament?.players || []).map((player: any) => {
    const courseScores = tournament.scores?.[player.id]?.[course.id] || {};
    const courseHandicap = tournament.handicaps?.[player.id]?.[course.id] ?? 0;

    let gross = 0;
    let par = 0;
    let pts = 0;
    let holesCompleted = 0;

    course.holes.forEach((hole: any, i: number) => {
      const hNum = hole.number || (i + 1);
      const score = courseScores[hNum];
      if (typeof score === 'number' && score > 0) {
        gross += score;
        par += hole.par;
        pts += calculateStableford(score, hole.par, hole.handicap || 0, courseHandicap);
        holesCompleted++;
      }
    });

    const toPar = gross > 0 ? gross - par : null;
    const toParText = toPar === null ? '-' : toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : `${toPar}`;
    const thru = holesCompleted === 0 ? '-' : holesCompleted === course.holes.length ? 'F' : String(holesCompleted);

    return { player, gross, pts, holesCompleted, toParText, thru, courseHandicap };
  });

  // Sort: started players first (by pts desc), then unstarted
  playerData.sort((a: any, b: any) => {
    if (a.holesCompleted === 0 && b.holesCompleted === 0) return 0;
    if (a.holesCompleted === 0) return 1;
    if (b.holesCompleted === 0) return -1;
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.holesCompleted - a.holesCompleted;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{course.name}</Text>
        <Text style={styles.subtitle}>ROUND LEADERBOARD</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#2d9e5f" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.card}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.headerText, { width: 28 }]}>#</Text>
              <Text style={[styles.headerText, { flex: 1 }]}>Player</Text>
              <Text style={[styles.headerText, { width: 44, textAlign: 'center' }]}>Thru</Text>
              <Text style={[styles.headerText, { width: 60, textAlign: 'center' }]}>To Par</Text>
              <Text style={[styles.headerText, { width: 52, textAlign: 'center' }]}>Pts</Text>
            </View>

            {playerData.map(({ player, holesCompleted, toParText, thru, pts }: any, index: number) => (
              <View key={player.id} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                <Text style={[styles.rankText, { width: 28 }]}>
                  {holesCompleted > 0 ? index + 1 : '—'}
                </Text>
                <Text style={[styles.playerText, { flex: 1 }]}>{player.username}</Text>
                <Text style={[styles.mutedText, { width: 44, textAlign: 'center' }]}>{thru}</Text>
                <Text style={[
                  styles.toParText,
                  { width: 60, textAlign: 'center' },
                  holesCompleted === 0 && styles.mutedText,
                ]}>
                  {toParText}
                </Text>
                <Text style={[
                  styles.pointsText,
                  { width: 52, textAlign: 'center' },
                  holesCompleted === 0 && styles.mutedText,
                ]}>
                  {holesCompleted > 0 ? pts : '-'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    fontSize: 22,
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  headerRow: {
    backgroundColor: '#062612',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
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
  mutedText: {
    fontSize: 13,
    color: '#bbb',
  },
  toParText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d9e5f',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#064E3B',
  },
});
