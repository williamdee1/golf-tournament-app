import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

type Props = {
  navigation: NavigationProp<any>;
};

export default function JoinTournamentScreen({ navigation }: Props) {
  const [tournamentCode, setTournamentCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [handicapIndex, setHandicapIndex] = useState('');

  const handleJoinTournament = () => {
    if (!tournamentCode.trim() || !playerName.trim() || !handicapIndex.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    Alert.alert('Success', `Joined tournament with code: ${tournamentCode}`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Tournament</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Tournament Code"
        value={tournamentCode}
        onChangeText={setTournamentCode}
        autoCapitalize="characters"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Your Name"
        value={playerName}
        onChangeText={setPlayerName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Handicap Index (e.g. 15.2)"
        value={handicapIndex}
        onChangeText={setHandicapIndex}
        keyboardType="decimal-pad"
      />
      
      <TouchableOpacity style={styles.button} onPress={handleJoinTournament}>
        <Text style={styles.buttonText}>Join Tournament</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#2e7d32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4caf50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});