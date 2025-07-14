import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, Avatar, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/useAppSelector';

export const ProfileScreen: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Avatar.Text 
              size={80} 
              label={user?.name?.charAt(0) || 'U'} 
              style={styles.avatar}
            />
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
            <Text style={styles.role}>{user?.role || 'Member'}</Text>
          </View>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title>Account Information</Title>
              <List.Item
                title="Email"
                description={user?.email || 'user@example.com'}
                left={props => <List.Icon {...props} icon="email" />}
              />
              <Divider />
              <List.Item
                title="Role"
                description={user?.role || 'Member'}
                left={props => <List.Icon {...props} icon="account-circle" />}
              />
              <Divider />
              <List.Item
                title="Teams"
                description={`${user?.teams?.length || 0} teams`}
                left={props => <List.Icon {...props} icon="account-group" />}
              />
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title>Settings</Title>
              <List.Item
                title="Notifications"
                description="Manage notification preferences"
                left={props => <List.Icon {...props} icon="bell" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {}}
              />
              <Divider />
              <List.Item
                title="Security"
                description="Password and biometric settings"
                left={props => <List.Icon {...props} icon="shield-account" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {}}
              />
              <Divider />
              <List.Item
                title="Privacy"
                description="Privacy and data settings"
                left={props => <List.Icon {...props} icon="lock" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {}}
              />
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#212121',
  },
  email: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
});