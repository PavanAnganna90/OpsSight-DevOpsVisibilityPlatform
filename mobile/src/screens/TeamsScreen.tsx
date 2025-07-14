import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Paragraph, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TeamsScreen: React.FC = () => {
  const teams = [
    {
      id: '1',
      name: 'Frontend Team',
      description: 'Responsible for web and mobile interfaces',
      members: 8,
      avatar: null,
    },
    {
      id: '2',
      name: 'Backend Team',
      description: 'API development and server management',
      members: 6,
      avatar: null,
    },
    {
      id: '3',
      name: 'DevOps Team',
      description: 'Infrastructure and deployment automation',
      members: 4,
      avatar: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Teams</Text>
          <Text style={styles.subtitle}>Your team memberships</Text>
          
          {teams.map((team) => (
            <Card key={team.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Avatar.Text 
                    size={48} 
                    label={team.name.charAt(0)} 
                    style={styles.avatar}
                  />
                  <View style={styles.teamInfo}>
                    <Title style={styles.teamName}>{team.name}</Title>
                    <Paragraph style={styles.teamDescription}>{team.description}</Paragraph>
                    <Text style={styles.memberCount}>{team.members} members</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#212121',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#757575',
  },
});