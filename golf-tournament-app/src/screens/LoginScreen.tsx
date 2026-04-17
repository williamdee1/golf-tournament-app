import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { API_ENDPOINTS } from '../config/api';

type Props = {
  navigation: NavigationProp<any>;
  onLogin: (user: any, token: string) => void;
};

// ─── Clean input with animated bottom border ──────────────────────────────────
type InputProps = {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
};

function MinimalInput({ placeholder, value, onChangeText, secureTextEntry, keyboardType }: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', '#2d9e5f'],
  });

  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{placeholder}</Text>
      <Animated.View style={[inputStyles.inputBox, { borderColor }]}>
        <TextInput
          style={[
            inputStyles.input,
            Platform.OS === 'web' ? ({
              outlineStyle: 'none',
              // Override browser autofill blue — must be a solid colour, not transparent
              WebkitBoxShadow: '0 0 0 30px #1e3d28 inset',
              WebkitTextFillColor: '#ffffff',
              caretColor: '#ffffff',
            } as any) : {},
          ]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="rgba(255,255,255,0.35)"
          selectionColor="#2d9e5f"
        />
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
    textTransform: 'uppercase' as any,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#1e3d28',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  input: {
    fontSize: 15,
    fontWeight: '300',
    color: '#ffffff',
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation, onLogin }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [handicapIndex, setHandicapIndex] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  // Staggered entry
  const titleAnim   = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(titleAnim,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(taglineAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(cardAnim,    { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const titleStyle   = { opacity: titleAnim,   transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] };
  const taglineStyle = { opacity: taglineAnim, transform: [{ translateY: taglineAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };
  const cardStyle    = { opacity: cardAnim,    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] };

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

  const canSubmit = !!(username.trim() && password.trim() && !isLoading);

  // Button glow on hover
  const buttonStyle: any[] = [
    styles.button,
    !canSubmit && styles.buttonDisabled,
    Platform.OS === 'web' && btnHovered && canSubmit && {
      backgroundColor: '#34c26a',
      boxShadow: '0 0 20px rgba(45,158,95,0.5)',
    },
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Animated.Text style={[styles.heroTitle, titleStyle]}>
            Caddie
          </Animated.Text>
          <Animated.Text style={[styles.tagline, taglineStyle]}>
            ELEVATE YOUR SCORECARD
          </Animated.Text>
        </View>

        {/* Login card */}
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            (Platform.OS === 'web' ? {
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            } : {}) as any,
          ]}
        >
          <MinimalInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
          />

          <MinimalInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <MinimalInput
              placeholder="Handicap Index (optional)"
              value={handicapIndex}
              onChangeText={setHandicapIndex}
              keyboardType="numeric"
            />
          )}

          <TouchableOpacity
            style={buttonStyle}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Elevating your game...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Linear gradient via backgroundImage on web; solid fallback on native
    backgroundColor: '#062612',
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(180deg, #062612 0%, #113d23 100%)' as any,
    } : {}),
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 110,
    paddingBottom: 60,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center' as any,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    marginBottom: 52,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: 5,
    textAlign: 'center',
  },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 36,
  },

  // ── Button ──
  button: {
    backgroundColor: '#2d9e5f',
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
    transitionProperty: 'background-color, box-shadow' as any,
    transitionDuration: '200ms' as any,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(45,158,95,0.25)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // ── Toggle ──
  toggleButton: {
    alignItems: 'center',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontWeight: '400',
  },
});
