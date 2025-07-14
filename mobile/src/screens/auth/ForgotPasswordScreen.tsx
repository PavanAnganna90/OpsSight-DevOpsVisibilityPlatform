import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, Title, Paragraph } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      return;
    }

    setLoading(true);
    try {
      // Handle forgot password logic
      console.log('Forgot password for:', email);
      setSent(true);
    } catch (error) {
      console.error('Forgot password failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Title style={styles.title}>Email Sent</Title>
            <Paragraph style={styles.subtitle}>
              We've sent a password reset link to {email}
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <Paragraph>
                Check your email inbox and click the link to reset your password.
                If you don't see the email, check your spam folder.
              </Paragraph>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={() => {}}
            style={styles.button}
          >
            Back to Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Title style={styles.title}>Forgot Password</Title>
            <Paragraph style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Button
                mode="contained"
                onPress={handleForgotPassword}
                loading={loading}
                disabled={loading || !email}
                style={styles.button}
              >
                Send Reset Link
              </Button>
            </Card.Content>
          </Card>

          <Button
            mode="text"
            onPress={() => {}}
            style={styles.backButton}
          >
            Back to Login
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
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
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  backButton: {
    alignSelf: 'center',
  },
});