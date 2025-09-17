import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import CreateTournamentScreen from '../screens/CreateTournamentScreen';
import JoinTournamentScreen from '../screens/JoinTournamentScreen';
import ApiTestScreen from '../screens/ApiTestScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4caf50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Golf Tournament' }}
        />
        <Stack.Screen 
          name="CreateTournament" 
          component={CreateTournamentScreen}
          options={{ title: 'Create Tournament' }}
        />
        <Stack.Screen 
          name="JoinTournament" 
          component={JoinTournamentScreen}
          options={{ title: 'Join Tournament' }}
        />
        <Stack.Screen 
          name="ApiTest" 
          component={ApiTestScreen}
          options={{ title: 'API Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}