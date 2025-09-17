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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [handicapIndex, setHandicapIndex] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (!isLogin && !username.trim()) {
      Alert.alert('Error', 'Username is required for registration');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? API_ENDPOINTS.login : API_ENDPOINTS.register;
      const body = isLogin
        ? { email: email.trim(), password }
        : {
            email: email.trim(),
            password,
            username: username.trim(),
            handicapIndex: handicapIndex ? parseFloat(handicapIndex) : null
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    setEmail('');
    setPassword('');
    setUsername('');
    setHandicapIndex('');
    setShowForgotPassword(false);
    setForgotEmail('');
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter your email address');
      } else {
        Alert.alert('Error', 'Please enter your email address');
      }
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        const message = 'If an account with that email exists, a password reset link has been sent to your email.';
        if (typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert('Success', message);
        }
        setShowForgotPassword(false);
        setForgotEmail('');
      } else {
        const errorMessage = `Error: ${data.error || 'Failed to send reset email'}`;
        if (typeof window !== 'undefined') {
          window.alert(errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = 'Failed to send reset email. Please try again.';
      if (typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Golf Tournament App</Text>
      <Text style={styles.subtitle}>
        {isLogin ? 'Sign in to your account' : 'Create a new account'}
      </Text>

      <View style={styles.form}>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
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
          style={[styles.button, (!email.trim() || !password.trim() || (!isLogin && !username.trim()) || isLoading) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!email.trim() || !password.trim() || (!isLogin && !username.trim()) || isLoading}
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

        {/* Forgot Password Link (only show on login) */}
        {isLogin && !showForgotPassword && (
          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => setShowForgotPassword(true)}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {/* Forgot Password Form */}
        {showForgotPassword && (
          <View style={styles.forgotPasswordSection}>
            <Text style={styles.forgotPasswordTitle}>Reset Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.forgotPasswordButtons}>
              <TouchableOpacity
                style={[styles.button, styles.forgotPasswordButton]}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotEmail('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Demo users for testing (development only) */}
      {isDevelopment && (
        <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>
          {isLogin ? 'Demo Login Accounts:' : 'Demo Registration Data:'}
        </Text>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => {
            setEmail('test1@example.com');
            setPassword('password123');
            if (!isLogin) {
              setUsername('TestPlayer1');
              setHandicapIndex('15.2');
            }
          }}
        >
          <Text style={styles.demoButtonText}>
            {isLogin ? 'Login as TestPlayer1' : 'Fill TestPlayer1 Data'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => {
            setEmail('test2@example.com');
            setPassword('password123');
            if (!isLogin) {
              setUsername('TestPlayer2');
              setHandicapIndex('8.5');
            }
          }}
        >
          <Text style={styles.demoButtonText}>
            {isLogin ? 'Login as TestPlayer2' : 'Fill TestPlayer2 Data'}
          </Text>
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
  forgotPasswordLink: {
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#2e7d32',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  forgotPasswordSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  forgotPasswordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  forgotPasswordButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  forgotPasswordButton: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#ff6b35',
  },
  cancelButton: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
});