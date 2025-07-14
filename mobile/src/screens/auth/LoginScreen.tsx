import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Title, Paragraph, Divider, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { OAuthProvider } from '../../services/OAuthService';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<OAuthProvider[]>([]);
  
  const { 
    login, 
    loginWithProvider, 
    biometricLogin, 
    checkBiometricSupport, 
    getAvailableProviders 
  } = useAuth();

  useEffect(() => {
    initializeAuthOptions();
  }, []);

  const initializeAuthOptions = async () => {
    try {
      // Get available OAuth providers
      const providers = getAvailableProviders();
      setAvailableProviders(providers);

      // Check biometric support
      const isSupported = await checkBiometricSupport();
      setBiometricSupported(isSupported);
      setShowBiometric(isSupported);
    } catch (error) {
      console.error('Error initializing auth options:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (providerId: string) => {
    setOauthLoading(providerId);
    try {
      await loginWithProvider(providerId);
    } catch (error) {
      console.error('OAuth login failed:', error);
      Alert.alert('Authentication Failed', `Failed to authenticate with ${providerId}. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      await biometricLogin();
    } catch (error) {
      console.error('Biometric login failed:', error);
      Alert.alert('Biometric Authentication Failed', 'Please try again or use another login method.');
    }
  };

  const getProviderIcon = (provider: OAuthProvider): string => {
    switch (provider.id) {
      case 'google':
        return 'logo-google';
      case 'microsoft':
        return 'logo-microsoft';
      case 'github':
        return 'logo-github';
      case 'gitlab':
        return 'git-branch-outline';
      default:
        return 'log-in-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Title style={styles.title}>Welcome Back</Title>
            <Paragraph style={styles.subtitle}>Sign in to your OpsSight account</Paragraph>
          </View>

          {/* Biometric Authentication */}
          {showBiometric && (
            <Card style={styles.biometricCard}>
              <Card.Content style={styles.biometricContent}>
                <IconButton
                  icon="fingerprint"
                  iconColor="#1976D2"
                  size={48}
                  onPress={handleBiometricLogin}
                  style={styles.biometricButton}
                />
                <Text style={styles.biometricText}>Use Biometric Authentication</Text>
              </Card.Content>
            </Card>
          )}

          {/* OAuth Providers */}
          {availableProviders.length > 0 && (
            <Card style={styles.oauthCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Continue with</Text>
                <View style={styles.oauthGrid}>
                  {availableProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      style={[styles.oauthButton, { borderColor: provider.color }]}
                      onPress={() => handleOAuthLogin(provider.id)}
                      disabled={oauthLoading !== null}
                    >
                      <Ionicons
                        name={getProviderIcon(provider) as any}
                        size={24}
                        color={provider.color}
                        style={styles.oauthIcon}
                      />
                      <Text style={[styles.oauthText, { color: provider.color }]}>
                        {provider.displayName}
                      </Text>
                      {oauthLoading === provider.id && (
                        <View style={styles.oauthLoader}>
                          <Text style={styles.loaderText}>...</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Chip mode="flat" style={styles.dividerChip}>
              or
            </Chip>
            <Divider style={styles.divider} />
          </View>

          {/* Traditional Login */}
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                left={<TextInput.Icon icon="email-outline" />}
              />
              
              <TextInput
                mode="outlined"
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                style={styles.input}
                left={<TextInput.Icon icon="lock-outline" />}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !email || !password || oauthLoading !== null}
                style={styles.button}
                icon="login"
              >
                Sign In with Email
              </Button>

              <Button
                mode="text"
                onPress={() => {
                  Alert.alert('Forgot Password', 'Password reset functionality will be implemented soon.');
                }}
                style={styles.forgotButton}
                disabled={loading || oauthLoading !== null}
              >
                Forgot Password?
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Button 
              mode="text" 
              onPress={() => {
                Alert.alert('Sign Up', 'Registration functionality will be implemented soon.');
              }}
              disabled={loading || oauthLoading !== null}
            >
              Sign Up
            </Button>
          </View>
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
  },
  // Biometric authentication
  biometricCard: {
    elevation: 2,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  biometricContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  biometricButton: {
    backgroundColor: '#E3F2FD',
    marginBottom: 8,
  },
  biometricText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  // OAuth providers
  oauthCard: {
    elevation: 2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 16,
    textAlign: 'center',
  },
  oauthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  oauthButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1.5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  oauthIcon: {
    marginRight: 8,
  },
  oauthText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  oauthLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loaderText: {
    fontSize: 18,
    color: '#666666',
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerChip: {
    marginHorizontal: 16,
    backgroundColor: '#F5F5F5',
  },
  // Traditional login
  card: {
    elevation: 4,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotButton: {
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#757575',
  },
});