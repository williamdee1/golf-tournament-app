import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: NavigationProp<any>;
  user: any;
  sessionToken: string;
  onLogout: () => void;
};

type Tournament = {
  id: string;
  name: string;
  coursesCount: number;
  playersCount: number;
  createdAt: string;
  status: string;
  createdBy?: string;
};

export default function HomeScreen({ navigation, user, sessionToken, onLogout }: Props) {
  const [createdTournaments, setCreatedTournaments] = useState<Tournament[]>([]);
  const [joinedTournaments, setJoinedTournaments] = useState<Tournament[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [tournamentId, setTournamentId] = useState('');
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (user && sessionToken) {
      loadTournaments();
    }
  }, [user, sessionToken]);

  const loadTournaments = async () => {
    setIsLoadingTournaments(true);
    try {
      const [createdResponse, joinedResponse] = await Promise.all([
        fetch(API_ENDPOINTS.createdTournaments, { headers: { 'Authorization': `Bearer ${sessionToken}` } }),
        fetch(API_ENDPOINTS.joinedTournaments, { headers: { 'Authorization': `Bearer ${sessionToken}` } }),
      ]);
      const createdData = await createdResponse.json();
      const joinedData = await joinedResponse.json();
      if (createdData.success) setCreatedTournaments(createdData.tournaments);
      if (joinedData.success) setJoinedTournaments(joinedData.tournaments);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setIsLoadingTournaments(false);
    }
  };

  const joinTournament = async () => {
    if (!tournamentId.trim()) {
      Alert.alert('Error', 'Please enter a tournament ID');
      return;
    }
    setIsJoining(true);
    try {
      const response = await fetch(API_ENDPOINTS.joinTournament(tournamentId.trim()), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        setTournamentId('');
        setShowJoinModal(false);
        loadTournaments();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      console.error('Join tournament error:', error);
      Alert.alert('Error', 'Failed to join tournament. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const openTournament = (tournament: Tournament) => {
    navigation.navigate('TournamentDetail', {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      isExisting: true,
    });
  };

  const deleteTournament = async (tournament: Tournament) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`);
    if (confirmed) {
      try {
        const response = await fetch(API_ENDPOINTS.deleteTournament(tournament.id), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        const data = await response.json();
        if (data.success) {
          loadTournaments();
        } else {
          window.alert(`Error: ${data.error || 'Failed to delete tournament'}`);
        }
      } catch (error) {
        window.alert('Error: Failed to delete tournament. Please try again.');
      }
    }
  };

  const TournamentCard = ({ tournament, showDelete }: { tournament: Tournament; showDelete?: boolean }) => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={() => openTournament(tournament)} activeOpacity={0.75}>
        <View style={styles.cardAccent} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>{tournament.name}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.cardChips}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>⛳ {tournament.coursesCount} course{tournament.coursesCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>👥 {tournament.playersCount} player{tournament.playersCount !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            ID: {tournament.id}  ·  {new Date(tournament.createdAt).toLocaleDateString('en-GB')}
          </Text>
        </View>
      </TouchableOpacity>
      {showDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteTournament(tournament)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>⛳ Golf Tournament</Text>
          <Text style={styles.welcomeText}>Welcome back, {user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTournament')} activeOpacity={0.85}>
          <Text style={styles.primaryButtonIcon}>＋</Text>
          <Text style={styles.primaryButtonText}>New Tournament</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={() => setShowJoinModal(true)} activeOpacity={0.85}>
          <Text style={styles.outlineButtonIcon}>🔗</Text>
          <Text style={styles.outlineButtonText}>Join Tournament</Text>
        </TouchableOpacity>
      </View>

      {/* My Tournaments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Tournaments</Text>
        <Text style={styles.sectionCount}>{createdTournaments.length} tournament{createdTournaments.length !== 1 ? 's' : ''}</Text>

        {isLoadingTournaments ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : createdTournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🏌️</Text>
            <Text style={styles.emptyStateText}>No tournaments yet</Text>
            <Text style={styles.emptyStateSubtext}>Create one to get started</Text>
          </View>
        ) : (
          createdTournaments.map(t => <TournamentCard key={t.id} tournament={t} showDelete />)
        )}
      </View>

      {/* Joined Tournaments */}
      {joinedTournaments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Joined Tournaments</Text>
          <Text style={styles.sectionCount}>{joinedTournaments.length} tournament{joinedTournaments.length !== 1 ? 's' : ''}</Text>
          {joinedTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </View>
      )}

      <TouchableOpacity style={styles.testButton} onPress={() => navigation.navigate('ApiTest')}>
        <Text style={styles.testButtonText}>Test API</Text>
      </TouchableOpacity>

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Tournament</Text>
            <Text style={styles.modalSubtitle}>Enter the 6-character tournament ID</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. ABC123"
              value={tournamentId}
              onChangeText={setTournamentId}
              autoCapitalize="characters"
              maxLength={6}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowJoinModal(false); setTournamentId(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalJoinButton, (!tournamentId.trim() || isJoining) && styles.disabledButton]}
                onPress={joinTournament}
                disabled={!tournamentId.trim() || isJoining}
              >
                <Text style={styles.modalJoinText}>{isJoining ? 'Joining...' : 'Join'}</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 28,
    backgroundColor: '#1b5e20',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  welcomeText: {
    fontSize: 14,
    color: '#a5d6a7',
    marginTop: 3,
    fontWeight: '500',
  },
  logoutButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonIcon: {
    color: '#a5d6a7',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2e7d32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineButtonIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  outlineButtonText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1b5e20',
    letterSpacing: 0.2,
  },
  sectionCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 12,
    fontWeight: '500',
  },

  // Tournament card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  cardAccent: {
    width: 5,
    backgroundColor: '#2e7d32',
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2e7d32',
    letterSpacing: 0.5,
  },
  cardChips: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#f0f4f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },
  cardMeta: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '400',
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyStateEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#aaa',
  },

  // Test button
  testButton: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#e8eae8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 28,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1b5e20',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 20,
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 4,
    color: '#1b5e20',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  modalJoinButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalJoinText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
