import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

type Props = {
  navigation: NavigationProp<any>;
};

export default function CreateTournament({ navigation }: Props) {
  const [tournamentName, setTournamentName] = useState('');

  const createTournament = () => {
    if (!tournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
      return;
    }

    // Create tournament and navigate to tournament detail page
    console.log(`Creating tournament: ${tournamentName}`);

    // Navigate to tournament detail screen with the tournament name
    navigation.navigate('TournamentDetail', {
      tournamentName: tournamentName.trim(),
      tournamentId: Date.now().toString() // Simple ID generation for now
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Tournament</Text>
      <Text style={styles.subtitle}>Enter a name for your golf tournament</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., Summer Golf Challenge 2024"
        value={tournamentName}
        onChangeText={setTournamentName}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, !tournamentName.trim() && styles.disabledButton]}
        onPress={createTournament}
        disabled={!tournamentName.trim()}
      >
        <Text style={styles.buttonText}>Create Tournament</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2e7d32',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 30,
    backgroundColor: '#f9f9f9',
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
  cancelButton: {
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});