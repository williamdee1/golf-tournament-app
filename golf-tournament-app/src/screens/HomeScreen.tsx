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
              <Text style={styles.chipText}>{tournament.coursesCount} course{tournament.coursesCount !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{tournament.playersCount} player{tournament.playersCount !== 1 ? 's' : ''}</Text>
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
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>Caddie</Text>
          <Text style={styles.welcomeText}>Welcome back, {user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('CreateTournament')} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>+ New Tournament</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={() => setShowJoinModal(true)} activeOpacity={0.85}>
          <Text style={styles.outlineButtonText}>Join Tournament</Text>
        </TouchableOpacity>
      </View>

      {/* My Tournaments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY TOURNAMENTS</Text>
          <Text style={styles.sectionCount}>{createdTournaments.length}</Text>
        </View>

        {isLoadingTournaments ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading...</Text>
          </View>
        ) : createdTournaments.length === 0 ? (
          <View style={styles.emptyState}>
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>JOINED TOURNAMENTS</Text>
            <Text style={styles.sectionCount}>{joinedTournaments.length}</Text>
          </View>
          {joinedTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
        </View>
      )}

      {/* Join Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Tournament</Text>
            <Text style={styles.modalSubtitle}>Enter the 6-character tournament ID</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. ABC123"
              placeholderTextColor="#aaa"
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
    backgroundColor: '#f0f3f0',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 28,
    backgroundColor: '#062612',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2d9e5f',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d9e5f',
  },
  outlineButtonText: {
    color: '#2d9e5f',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
  },

  // Tournament card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  cardAccent: {
    width: 3,
    backgroundColor: '#2d9e5f',
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
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(45,158,95,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 1,
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
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  cardMeta: {
    fontSize: 10,
    color: '#bbb',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#ccc',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#888',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#bbb',
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
    borderRadius: 6,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#062612',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 14,
    fontSize: 20,
    marginBottom: 24,
    backgroundColor: '#fafafa',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 4,
    color: '#062612',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  modalCancelText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  modalJoinButton: {
    flex: 1,
    backgroundColor: '#2d9e5f',
    padding: 13,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalJoinText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: 'rgba(45,158,95,0.25)',
  },
});
