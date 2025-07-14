import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';

export const BiometricSetupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { enableBiometric, checkBiometricSupport } = useAuth();

  const handleEnableBiometric = async () => {
    setLoading(true);
    try {
      const isSupported = await checkBiometricSupport();
      if (isSupported) {
        await enableBiometric();
        // Navigate to main app
      } else {
        console.log('Biometric not supported');
      }
    } catch (error) {
      console.error('Biometric setup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="finger-print" size={80} color="#1976D2" />
          <Title style={styles.title}>Secure Your Account</Title>
          <Paragraph style={styles.subtitle}>
            Enable biometric authentication for quick and secure access
          </Paragraph>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>Enhanced Security</Text>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="flash" size={24} color="#FF9800" />
              <Text style={styles.featureText}>Quick Access</Text>
            </View>
            
            <View style={styles.feature}>
              <Ionicons name="lock-closed" size={24} color="#2196F3" />
              <Text style={styles.featureText}>Data Protection</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleEnableBiometric}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Enable Biometric Auth
          </Button>
          
          <Button
            mode="text"
            onPress={() => {}}
            style={styles.button}
          >
            Skip for Now
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#212121',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    elevation: 4,
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#212121',
  },
  actions: {
    paddingBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
});