import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import ApiTestScreen from './src/screens/ApiTestScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateTournament from './src/screens/CreateTournament';
import TournamentDetail from './src/screens/TournamentDetail';
import LoginScreen from './src/screens/LoginScreen';
import CourseScorecard from './src/screens/CourseScorecard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState('');

  const handleLogin = (userData: any, token: string) => {
    setUser(userData);
    setSessionToken(token);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setSessionToken('');
    setCurrentScreen('login');
  };

  const navigation = {
    navigate: (screen: string, params?: any) => {
      setCurrentScreen(screen);
      if (params) {
        setScreenParams(params);
      }
    },
    goBack: () => setCurrentScreen('home')
  };

  const renderScreen = () => {
    if (!user) {
      return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
    }

    switch (currentScreen) {
      case 'api':
        return <ApiTestScreen />;
      case 'CreateTournament':
        return <CreateTournament navigation={navigation} />;
      case 'TournamentDetail':
        return <TournamentDetail navigation={navigation} route={{ params: screenParams }} user={user} sessionToken={sessionToken} />;
      case 'CourseScorecard':
        return <CourseScorecard navigation={navigation} route={{ params: screenParams }} user={user} sessionToken={sessionToken} />;
      case 'login':
        return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
      default:
        return <HomeScreen navigation={navigation} user={user} sessionToken={sessionToken} onLogout={handleLogout} />;
    }
  };

  return (
    <View style={styles.container}>
      {user && currentScreen !== 'home' && !currentScreen.includes('login') && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      )}
      {renderScreen()}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  backButtonText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
