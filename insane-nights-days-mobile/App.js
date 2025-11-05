import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomePage from './screens/HomePage';
import MenuPage from './screens/MenuPage';
import EventsPage from './screens/EventsPage';
import ProfilePage from './screens/ProfilePage';
import TicketsPage from './screens/TicketsPage';
import EventDetailPage from './screens/EventDetailPage';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0b0b0e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomePage}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Menu" 
          component={MenuPage}
          options={{ title: 'Menu' }}
        />
        <Stack.Screen 
          name="Events" 
          component={EventsPage}
          options={{ title: 'Événements' }}
        />
        <Stack.Screen 
          name="EventDetail" 
          component={EventDetailPage}
          options={{ title: 'Détails' }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfilePage}
          options={{ title: 'Mon Profil' }}
        />
        <Stack.Screen 
          name="Tickets" 
          component={TicketsPage}
          options={{ title: 'Mes Tickets' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
