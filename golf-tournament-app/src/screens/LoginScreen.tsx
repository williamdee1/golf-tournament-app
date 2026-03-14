import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config/api';

const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  __DEV__ ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost');

type Props = {
  navigation: NavigationProp<any>;
  onLogin: (user: any, token: string) => void;
};

export default function LoginScreen({ navigation, onLogin }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [handicapIndex, setHandicapIndex] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? API_ENDPOINTS.login : API_ENDPOINTS.register;
      const body = isLogin
        ? { username: username.trim(), password }
        : { username: username.trim(), password, handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user, data.sessionToken);
      } else {
        Alert.alert('Error', data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', `Failed to connect to server: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
    setHandicapIndex('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Golf Tournament App</Text>
      <Text style={styles.subtitle}>
        {isLogin ? 'Sign in to your account' : 'Create a new account'}
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Handicap Index (optional)"
            value={handicapIndex}
            onChangeText={setHandicapIndex}
            keyboardType="numeric"
          />
        )}

        <TouchableOpacity
          style={[styles.button, (!username.trim() || !password.trim() || isLoading) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!username.trim() || !password.trim() || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
          <Text style={styles.toggleButtonText}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Demo users for testing (development only) */}
      {isDevelopment && (
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Accounts:</Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => { setUsername('TestPlayer1'); setPassword('password123'); }}
          >
            <Text style={styles.demoButtonText}>Login as TestPlayer1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => { setUsername('TestPlayer2'); setPassword('password123'); }}
          >
            <Text style={styles.demoButtonText}>Login as TestPlayer2</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 32,
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
  form: {
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
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
  toggleButton: {
    padding: 10,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#2e7d32',
    fontSize: 16,
  },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  demoButton: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
    minWidth: 150,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#666',
    fontSize: 12,
  },
});
