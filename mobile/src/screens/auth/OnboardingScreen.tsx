import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export const OnboardingScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Title style={styles.title}>OpsSight Mobile</Title>
          <Paragraph style={styles.subtitle}>
            Monitor your DevOps infrastructure on the go
          </Paragraph>
        </View>

        <View style={styles.features}>
          <Card style={styles.featureCard}>
            <Card.Content>
              <Title>Real-time Monitoring</Title>
              <Paragraph>Track system performance and health metrics</Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.featureCard}>
            <Card.Content>
              <Title>Instant Alerts</Title>
              <Paragraph>Get notified about critical issues immediately</Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.featureCard}>
            <Card.Content>
              <Title>Team Collaboration</Title>
              <Paragraph>Work together with your team members</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.actions}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => {}}
          >
            Get Started
          </Button>
          
          <Button
            mode="text"
            style={styles.button}
            onPress={() => {}}
          >
            I already have an account
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
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1976D2',
  },
  subtitle: {
    fontSize: 18,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
  },
  featureCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actions: {
    paddingBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
});