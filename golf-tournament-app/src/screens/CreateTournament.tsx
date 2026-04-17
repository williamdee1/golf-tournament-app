import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
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

    navigation.navigate('TournamentDetail', {
      tournamentName: tournamentName.trim(),
      tournamentId: Date.now().toString()
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Tournament</Text>
        <Text style={styles.headerSubtitle}>Give your tournament a name</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.inputLabel}>TOURNAMENT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Summer Golf Challenge 2026"
          placeholderTextColor="#bbb"
          value={tournamentName}
          onChangeText={setTournamentName}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, !tournamentName.trim() && styles.disabledButton]}
          onPress={createTournament}
          disabled={!tournamentName.trim()}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Create Tournament</Text>
        </TouchableOpacity>
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
    paddingBottom: 28,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },
  body: {
    padding: 20,
    paddingTop: 28,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2d9e5f',
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    fontWeight: '300',
  },
  button: {
    backgroundColor: '#2d9e5f',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(45,158,95,0.25)',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
