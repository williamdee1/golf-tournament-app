import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import ApiTestScreen from './src/screens/ApiTestScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateTournament from './src/screens/CreateTournament';
import TournamentDetail from './src/screens/TournamentDetail';
import LoginScreen from './src/screens/LoginScreen';
import CourseScorecard from './src/screens/CourseScorecard';
import GroupScorecard from './src/screens/GroupScorecard';
import FullLeaderboard from './src/screens/FullLeaderboard';

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';


export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [screenHistory, setScreenHistory] = useState<Array<{screen: string, params: any}>>([]);
  const [user, setUser] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState('');
  // Track whether initial session restore has run
  const [sessionRestored, setSessionRestored] = useState(false);
  // Ref so popstate handler always sees latest history
  const screenHistoryRef = useRef<Array<{screen: string, params: any}>>([]);

  // Restore session from localStorage on first load
  useEffect(() => {
    if (isWeb) {
      try {
        const storedUser = localStorage.getItem('golf_user');
        const storedToken = localStorage.getItem('golf_token');
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setSessionToken(storedToken);
          setCurrentScreen('home');
        }
      } catch (_) {}
    }
    setSessionRestored(true);

    // Push an initial history entry so the first back press is handled by us,
    // not by the browser navigating away from the app.
    if (isWeb) {
      window.history.replaceState({ appNav: true }, '');
    }
  }, []);

  // Keep ref in sync with state for use inside event listeners
  useEffect(() => {
    screenHistoryRef.current = screenHistory;
  }, [screenHistory]);

  // Intercept browser/OS back button
  useEffect(() => {
    if (!isWeb) return;

    const handlePopState = () => {
      const history = screenHistoryRef.current;
      if (history.length > 0) {
        const prev = history[history.length - 1];
        setScreenHistory(h => h.slice(0, -1));
        setCurrentScreen(prev.screen);
        setScreenParams(prev.params);
        // Keep a history entry so subsequent back presses still fire popstate
        window.history.pushState({ appNav: true }, '');
      } else {
        // No more app history — push a guard entry so the next back press
        // goes back to the previous site rather than doing nothing.
        window.history.pushState({ appNav: true }, '');
        setCurrentScreen('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = (userData: any, token: string) => {
    if (isWeb) {
      try {
        localStorage.setItem('golf_user', JSON.stringify(userData));
        localStorage.setItem('golf_token', token);
      } catch (_) {}
    }
    setUser(userData);
    setSessionToken(token);
    setCurrentScreen('home');
    setScreenHistory([]);
  };

  const handleLogout = () => {
    if (isWeb) {
      try {
        localStorage.removeItem('golf_user');
        localStorage.removeItem('golf_token');
      } catch (_) {}
    }
    setUser(null);
    setSessionToken('');
    setCurrentScreen('login');
    setScreenHistory([]);
  };

  const navigation = {
    navigate: (screen: string, params?: any) => {
      setScreenHistory(prev => [...prev, { screen: currentScreen, params: screenParams }]);
      setCurrentScreen(screen);
      setScreenParams(params || {});
      // Push a browser history entry so the back button fires popstate
      if (isWeb) {
        window.history.pushState({ appNav: true }, '');
      }
    },
    goBack: () => {
      if (screenHistory.length > 0) {
        const prev = screenHistory[screenHistory.length - 1];
        setScreenHistory(h => h.slice(0, -1));
        setCurrentScreen(prev.screen);
        setScreenParams(prev.params);
      } else {
        setCurrentScreen('home');
      }
    }
  };

  // Don't render until we've checked localStorage (avoids login flash on refresh)
  if (!sessionRestored) return null;

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
      case 'GroupScorecard':
        return <GroupScorecard navigation={navigation} route={{ params: screenParams }} user={user} sessionToken={sessionToken} />;
      case 'FullLeaderboard':
        return <FullLeaderboard navigation={navigation} route={{ params: screenParams }} user={user} sessionToken={sessionToken} />;
      case 'login':
        return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
      default:
        return <HomeScreen navigation={navigation} user={user} sessionToken={sessionToken} onLogout={handleLogout} />;
    }
  };

  return (
    <View style={styles.container}>
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
});
