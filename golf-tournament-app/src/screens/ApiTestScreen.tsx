import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { golfCourseApi } from '../services/golfCourseApi';
import { API_ENDPOINTS } from '../config/api';

export default function ApiTestScreen() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult('Testing API connection...');
    
    try {
      const isConnected = await golfCourseApi.testConnection();
      setTestResult(isConnected ? 'API connection successful!' : 'API connection failed');
    } catch (error) {
      setTestResult(`API test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testBackendConnection = async () => {
    setLoading(true);
    setTestResult('Testing backend connection...');
    
    try {
      const response = await fetch(API_ENDPOINTS.test);
      const data = await response.json();
      setTestResult(`Backend test result: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setTestResult(`Backend test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSearchCourses = async () => {
    setLoading(true);
    setTestResult('Searching for golf courses...');
    
    try {
      const courses = await golfCourseApi.searchCourses('pebble beach', 5);
      setTestResult(`Found ${courses.length} courses:\n${JSON.stringify(courses, null, 2)}`);
    } catch (error) {
      setTestResult(`Search failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Golf Course API Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test Backend Connection" 
          onPress={testBackendConnection}
          disabled={loading}
        />
        <Button 
          title="Test API Connection" 
          onPress={testApiConnection}
          disabled={loading}
        />
        <Button 
          title="Test Course Search" 
          onPress={testSearchCourses}
          disabled={loading}
        />
      </View>

      <ScrollView style={styles.resultContainer}>
        <Text style={styles.resultText}>{testResult}</Text>
      </ScrollView>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});