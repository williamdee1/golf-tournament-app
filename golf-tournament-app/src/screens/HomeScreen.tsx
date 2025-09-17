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
        fetch(API_ENDPOINTS.createdTournaments, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }),
        fetch(API_ENDPOINTS.joinedTournaments, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        })
      ]);

      const createdData = await createdResponse.json();
      const joinedData = await joinedResponse.json();

      if (createdData.success) {
        setCreatedTournaments(createdData.tournaments);
      }
      if (joinedData.success) {
        setJoinedTournaments(joinedData.tournaments);
      }
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
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', data.message);
        setTournamentId('');
        setShowJoinModal(false);
        loadTournaments(); // Refresh tournament list
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
      isExisting: true
    });
  };

  const deleteTournament = async (tournament: Tournament) => {
    console.log('Delete tournament pressed:', tournament.id, tournament.name);

    // Use window.confirm for web compatibility
    const confirmed = window.confirm(`Are you sure you want to delete "${tournament.name}"? This action cannot be undone.`);
    if (confirmed) {
            try {
              const response = await fetch(API_ENDPOINTS.deleteTournament(tournament.id), {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${sessionToken}`,
                },
              });

              const data = await response.json();

              if (data.success) {
                window.alert('Tournament deleted successfully!');
                loadTournaments(); // Refresh tournament list
              } else {
                window.alert(`Error: ${data.error || 'Failed to delete tournament'}`);
              }
            } catch (error) {
              console.error('Delete tournament error:', error);
              window.alert('Error: Failed to delete tournament. Please try again.');
            }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Golf Tournament App</Text>
          <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreateTournament')}
        >
          <Text style={styles.buttonText}>Create Tournament</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowJoinModal(true)}
        >
          <Text style={styles.secondaryButtonText}>Join Tournament</Text>
        </TouchableOpacity>
      </View>

      {/* Created Tournaments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Tournaments ({createdTournaments.length})</Text>
        {isLoadingTournaments ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : createdTournaments.length === 0 ? (
          <Text style={styles.emptyText}>No tournaments created yet</Text>
        ) : (
          createdTournaments.map((tournament) => (
            <View key={tournament.id} style={styles.tournamentCard}>
              <TouchableOpacity
                style={styles.tournamentContent}
                onPress={() => openTournament(tournament)}
                activeOpacity={0.7}
              >
                <View style={styles.tournamentInfo}>
                  <Text style={styles.tournamentName}>{tournament.name}</Text>
                  <Text style={styles.tournamentDetails}>
                    ID: {tournament.id} • {tournament.coursesCount} courses • {tournament.playersCount} players
                  </Text>
                  <Text style={styles.tournamentDate}>
                    Created: {new Date(tournament.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.tournamentStatus}>{tournament.status}</Text>
              </TouchableOpacity>
              <View style={styles.deleteButtonWrapper}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    console.log('Delete button clicked for tournament:', tournament.id);
                    deleteTournament(tournament);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Joined Tournaments Section */}
      {joinedTournaments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Joined Tournaments ({joinedTournaments.length})</Text>
          {joinedTournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              style={styles.tournamentCard}
              onPress={() => openTournament(tournament)}
            >
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <Text style={styles.tournamentDetails}>
                  ID: {tournament.id} • {tournament.coursesCount} courses • {tournament.playersCount} players
                </Text>
                <Text style={styles.tournamentDetails}>
                  Created by: {tournament.createdBy}
                </Text>
              </View>
              <Text style={styles.tournamentStatus}>{tournament.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => navigation.navigate('ApiTest')}
      >
        <Text style={styles.testButtonText}>Test API</Text>
      </TouchableOpacity>

      {/* Join Tournament Modal */}
      <Modal
        visible={showJoinModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Tournament</Text>
            <Text style={styles.modalSubtitle}>Enter the tournament ID to join</Text>

            <TextInput
              style={styles.input}
              placeholder="Tournament ID (e.g., ABC123)"
              value={tournamentId}
              onChangeText={setTournamentId}
              autoCapitalize="characters"
              maxLength={6}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowJoinModal(false);
                  setTournamentId('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalJoinButton, (!tournamentId.trim() || isJoining) && styles.disabledButton]}
                onPress={joinTournament}
                disabled={!tournamentId.trim() || isJoining}
              >
                <Text style={styles.modalJoinText}>
                  {isJoining ? 'Joining...' : 'Join'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    margin: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontStyle: 'italic',
  },
  tournamentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative',
    paddingRight: 60,
  },
  tournamentContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  tournamentDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tournamentDate: {
    fontSize: 11,
    color: '#999',
  },
  tournamentStatus: {
    backgroundColor: '#4caf50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  testButton: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#666',
    fontSize: 14,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
    textTransform: 'uppercase',
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
  modalJoinButton: {
    flex: 0.45,
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalJoinText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  deleteButtonWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    zIndex: 1,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});