'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatChannel, OnlineUser, Notification, CollaborationContext } from '@/types/collaboration';
import { useToast } from '@/contexts/ToastContext';

export function useCollaboration() {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contexts, setContexts] = useState<CollaborationContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState<Record<string, string[]>>({});
  const { addToast } = useToast();
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Generate mock data
  const generateMockData = useCallback(() => {
    const mockUsers: OnlineUser[] = [
      {
        id: 'user1',
        name: 'Alex Chen',
        email: 'alex@opssight.com',
        avatar: undefined,
        role: 'DevOps Engineer',
        status: 'online',
        lastSeen: new Date().toISOString(),
        currentActivity: {
          type: 'debugging',
          resource: 'payment-service logs',
          timestamp: new Date().toISOString()
        },
        location: {
          page: '/logs',
          details: 'Analyzing error patterns'
        }
      },
      {
        id: 'user2',
        name: 'Sarah Johnson',
        email: 'sarah@opssight.com',
        role: 'Platform Engineer',
        status: 'busy',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        currentActivity: {
          type: 'deploying',
          resource: 'api-gateway v2.1.0',
          timestamp: new Date().toISOString()
        }
      },
      {
        id: 'user3',
        name: 'Mike Rodriguez',
        email: 'mike@opssight.com',
        role: 'SRE',
        status: 'away',
        lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        id: 'user4',
        name: 'Emily Zhang',
        email: 'emily@opssight.com',
        role: 'Backend Engineer',
        status: 'online',
        lastSeen: new Date().toISOString(),
        currentActivity: {
          type: 'viewing',
          resource: 'infrastructure dashboard',
          timestamp: new Date().toISOString()
        }
      }
    ];

    const mockChannels: ChatChannel[] = [
      {
        id: 'general',
        name: 'general',
        description: 'General team discussions',
        type: 'public',
        topic: 'Welcome to OpsSight! =� Keep discussions productive and helpful.',
        members: mockUsers.map(user => ({
          userId: user.id,
          role: 'member' as const,
          joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastReadAt: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
          permissions: {
            canPost: true,
            canInvite: true,
            canManage: false,
            canDelete: false
          },
          notifications: {
            enabled: true,
            mentions: true,
            all: false
          }
        })),
        createdBy: 'user1',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 3,
        settings: {
          notifications: true,
          mentions: true,
          threadedReplies: true,
          messageRetention: 365
        },
        archived: false,
        pinned: true
      },
      {
        id: 'incidents',
        name: 'incidents',
        description: 'Incident response coordination',
        type: 'public',
        topic: '=� Current incidents: Payment API latency spike',
        members: mockUsers.slice(0, 3).map(user => ({
          userId: user.id,
          role: user.id === 'user1' ? 'admin' as const : 'member' as const,
          joinedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          lastReadAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000).toISOString(),
          permissions: {
            canPost: true,
            canInvite: user.id === 'user1',
            canManage: user.id === 'user1',
            canDelete: user.id === 'user1'
          },
          notifications: {
            enabled: true,
            mentions: true,
            all: true
          }
        })),
        createdBy: 'user1',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        unreadCount: 7,
        settings: {
          notifications: true,
          mentions: true,
          threadedReplies: true,
          messageRetention: 90
        },
        archived: false,
        pinned: true
      },
      {
        id: 'deployments',
        name: 'deployments',
        description: 'Deployment notifications and discussions',
        type: 'public',
        members: mockUsers.map(user => ({
          userId: user.id,
          role: 'member' as const,
          joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          permissions: {
            canPost: true,
            canInvite: false,
            canManage: false,
            canDelete: false
          },
          notifications: {
            enabled: true,
            mentions: true,
            all: false
          }
        })),
        createdBy: 'user2',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        unreadCount: 0,
        settings: {
          notifications: true,
          mentions: true,
          threadedReplies: false,
          messageRetention: 180
        },
        archived: false,
        pinned: false
      },
      {
        id: 'dm-user1-user2',
        name: 'Alex Chen, Sarah Johnson',
        type: 'direct',
        members: [
          {
            userId: 'user1',
            role: 'member',
            joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: {
              canPost: true,
              canInvite: false,
              canManage: false,
              canDelete: true
            },
            notifications: {
              enabled: true,
              mentions: true,
              all: true
            }
          },
          {
            userId: 'user2',
            role: 'member',
            joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            permissions: {
              canPost: true,
              canInvite: false,
              canManage: false,
              canDelete: true
            },
            notifications: {
              enabled: true,
              mentions: true,
              all: true
            }
          }
        ],
        createdBy: 'user1',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        unreadCount: 1,
        settings: {
          notifications: true,
          mentions: true,
          threadedReplies: false,
          messageRetention: 365
        },
        archived: false,
        pinned: false
      }
    ];

    const generateMessagesForChannel = (channelId: string, count: number = 20): ChatMessage[] => {
      const messageTemplates = [
        'Hey team! =K',
        'Has anyone seen the latest metrics from the payment service?',
        'The deployment went smoothly, no issues detected so far',
        'I\'m investigating a potential memory leak in the API gateway',
        'Great job on resolving that incident quickly! <�',
        'Can we schedule a post-mortem for tomorrow?',
        'The new monitoring dashboard looks fantastic',
        'Alert: High CPU usage detected on production servers',
        'Rolling back the deployment due to increased error rates',
        'Database migration completed successfully',
        'Code review needed for PR #1234',
        'Our uptime is looking solid this month! =�',
        'Need assistance with Kubernetes configuration',
        'Security scan completed - all clear ',
        'Performance optimization deployed, seeing 20% improvement'
      ];

      const codeSnippets = [
        'kubectl get pods -n production',
        'docker logs container-id --tail 100',
        'SELECT * FROM metrics WHERE timestamp > NOW() - INTERVAL 1 HOUR',
        'curl -X GET https://api.opssight.com/health',
        'terraform apply -auto-approve'
      ];

      return Array.from({ length: count }, (_, i) => {
        const timestamp = new Date(Date.now() - (count - i) * 5 * 60 * 1000);
        const author = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        const isCode = Math.random() < 0.1;
        const isSystem = Math.random() < 0.05;
        
        let content: string;
        let type: ChatMessage['type'] = 'text';
        
        if (isSystem) {
          type = 'system';
          content = `${author.name} joined the channel`;
        } else if (isCode) {
          type = 'code';
          content = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        } else {
          content = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        }

        return {
          id: `msg-${channelId}-${i}`,
          content,
          type,
          author,
          timestamp: timestamp.toISOString(),
          reactions: Math.random() < 0.3 ? [
            {
              emoji: ['=M', '<�', 'd', '=�'][Math.floor(Math.random() * 4)],
              users: [mockUsers[Math.floor(Math.random() * mockUsers.length)].id],
              count: 1
            }
          ] : [],
          mentions: content.includes('@') ? ['user1'] : [],
          metadata: isCode ? { codeLanguage: 'bash' } : undefined
        };
      });
    };

    const mockMessages: Record<string, ChatMessage[]> = {};
    mockChannels.forEach(channel => {
      mockMessages[channel.id] = generateMessagesForChannel(channel.id);
      // Update lastMessage
      const channelMessages = mockMessages[channel.id];
      if (channelMessages.length > 0) {
        channel.lastMessage = channelMessages[channelMessages.length - 1];
      }
    });

    const mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        type: 'mention',
        title: 'You were mentioned in #incidents',
        message: 'Alex Chen mentioned you: "@current-user can you check the logs?"',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        read: false,
        priority: 'high',
        source: {
          type: 'chat',
          id: 'incidents',
          name: 'incidents'
        },
        metadata: {
          channelId: 'incidents',
          messageId: 'msg-incidents-15',
          userId: 'user1'
        }
      },
      {
        id: 'notif-2',
        type: 'alert',
        title: 'Critical Alert: High Error Rate',
        message: 'Payment service error rate exceeded 5% threshold',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
        priority: 'urgent',
        source: {
          type: 'monitoring',
          id: 'alert-123',
          name: 'Payment Service Error Rate'
        },
        actions: [
          {
            id: 'acknowledge',
            label: 'Acknowledge',
            type: 'primary',
            action: 'acknowledge_alert'
          },
          {
            id: 'escalate',
            label: 'Escalate',
            type: 'danger',
            action: 'escalate_alert'
          }
        ]
      },
      {
        id: 'notif-3',
        type: 'deployment',
        title: 'Deployment Completed',
        message: 'api-gateway v2.1.0 deployed to production successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true,
        priority: 'medium',
        source: {
          type: 'pipeline',
          id: 'deploy-456',
          name: 'API Gateway Deployment'
        }
      }
    ];

    const mockContexts: CollaborationContext[] = [
      {
        id: 'incident-123',
        type: 'incident',
        title: 'Payment API Latency Spike',
        description: 'Payment processing times increased by 300% in the last hour',
        status: 'active',
        participants: [
          { userId: 'user1', role: 'lead', joinedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
          { userId: 'user2', role: 'participant', joinedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
          { userId: 'user3', role: 'participant', joinedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() }
        ],
        timeline: [
          {
            id: 'timeline-1',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            type: 'action',
            data: { action: 'incident_created', description: 'Incident created automatically from alert' },
            userId: 'system'
          },
          {
            id: 'timeline-2',
            timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
            type: 'user_joined',
            data: { userId: 'user1', role: 'lead' }
          }
        ],
        resources: [
          { type: 'alert', id: 'alert-123', name: 'Payment Service Error Rate', url: '/monitoring/alerts/123' },
          { type: 'log', id: 'logs-payment', name: 'Payment Service Logs', url: '/logs?service=payment' },
          { type: 'runbook', id: 'runbook-payment', name: 'Payment Service Runbook', url: '/docs/runbooks/payment' }
        ],
        chat: {
          channelId: 'incident-123-chat',
          messageCount: 23,
          lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      }
    ];

    return {
      users: mockUsers,
      channels: mockChannels,
      messages: mockMessages,
      notifications: mockNotifications,
      contexts: mockContexts
    };
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData = generateMockData();
        setChannels(mockData.channels);
        setMessages(mockData.messages);
        setOnlineUsers(mockData.users);
        setNotifications(mockData.notifications);
        setContexts(mockData.contexts);
        setActiveChannel(mockData.channels[0]);
        setConnected(true);
      } catch (error) {
        console.error('Failed to initialize collaboration data:', error);
        addToast({
          type: 'error',
          title: 'Connection Failed',
          description: 'Could not connect to collaboration service',
          duration: 5000
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [generateMockData, addToast]);

  // Simulate real-time updates
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      // Randomly update user status
      if (Math.random() < 0.1) {
        setOnlineUsers(prev => prev.map(user => ({
          ...user,
          status: Math.random() < 0.1 ? 
            (['online', 'away', 'busy'] as const)[Math.floor(Math.random() * 3)] : 
            user.status
        })));
      }

      // Randomly add new messages
      if (Math.random() < 0.3) {
        const randomChannel = channels[Math.floor(Math.random() * channels.length)];
        const randomUser = onlineUsers[Math.floor(Math.random() * onlineUsers.length)];
        
        if (randomChannel && randomUser) {
          const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            content: 'This is a simulated real-time message',
            type: 'text',
            author: randomUser,
            timestamp: new Date().toISOString(),
            reactions: [],
            mentions: []
          };

          setMessages(prev => ({
            ...prev,
            [randomChannel.id]: [...(prev[randomChannel.id] || []), newMessage]
          }));

          // Update channel's last message and unread count
          setChannels(prev => prev.map(channel => 
            channel.id === randomChannel.id ? {
              ...channel,
              lastMessage: newMessage,
              unreadCount: channel.id === activeChannel?.id ? 0 : channel.unreadCount + 1
            } : channel
          ));
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [connected, channels, onlineUsers, activeChannel]);

  // Action functions
  const sendMessage = useCallback(async (channelId: string, content: string, type: ChatMessage['type'] = 'text') => {
    try {
      const currentUser = onlineUsers.find(u => u.id === 'current-user') || onlineUsers[0];
      
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        content,
        type,
        author: currentUser,
        timestamp: new Date().toISOString(),
        reactions: [],
        mentions: content.match(/@\w+/g) || []
      };

      setMessages(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] || []), newMessage]
      }));

      // Update channel's last message
      setChannels(prev => prev.map(channel => 
        channel.id === channelId ? {
          ...channel,
          lastMessage: newMessage,
          updatedAt: new Date().toISOString()
        } : channel
      ));

      // Clear typing indicator
      setTyping(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter(userId => userId !== currentUser.id)
      }));

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Message Failed',
        description: 'Could not send message',
        duration: 3000
      });
    }
  }, [onlineUsers, addToast]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const currentUserId = 'current-user';
    
    setMessages(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(channelId => {
        updated[channelId] = updated[channelId].map(message => {
          if (message.id === messageId) {
            const existingReaction = message.reactions.find(r => r.emoji === emoji);
            if (existingReaction) {
              if (existingReaction.users.includes(currentUserId)) {
                // Remove reaction
                return {
                  ...message,
                  reactions: message.reactions.map(r => 
                    r.emoji === emoji ? {
                      ...r,
                      users: r.users.filter(id => id !== currentUserId),
                      count: r.count - 1
                    } : r
                  ).filter(r => r.count > 0)
                };
              } else {
                // Add reaction
                return {
                  ...message,
                  reactions: message.reactions.map(r => 
                    r.emoji === emoji ? {
                      ...r,
                      users: [...r.users, currentUserId],
                      count: r.count + 1
                    } : r
                  )
                };
              }
            } else {
              // New reaction
              return {
                ...message,
                reactions: [...message.reactions, {
                  emoji,
                  users: [currentUserId],
                  count: 1
                }]
              };
            }
          }
          return message;
        });
      });
      return updated;
    });
  }, []);

  const markAsRead = useCallback((channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, unreadCount: 0 } : channel
    ));
  }, []);

  const setUserTyping = useCallback((channelId: string, isTyping: boolean) => {
    const currentUserId = 'current-user';
    
    if (isTyping) {
      setTyping(prev => ({
        ...prev,
        [channelId]: [...new Set([...(prev[channelId] || []), currentUserId])]
      }));
      
      // Clear existing timeout
      if (typingTimeoutRef.current[channelId]) {
        clearTimeout(typingTimeoutRef.current[channelId]);
      }
      
      // Set new timeout
      typingTimeoutRef.current[channelId] = setTimeout(() => {
        setTyping(prev => ({
          ...prev,
          [channelId]: (prev[channelId] || []).filter(id => id !== currentUserId)
        }));
      }, 3000);
    } else {
      setTyping(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter(id => id !== currentUserId)
      }));
      
      if (typingTimeoutRef.current[channelId]) {
        clearTimeout(typingTimeoutRef.current[channelId]);
      }
    }
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId ? { ...notification, read: true } : notification
    ));
  }, []);

  const createChannel = useCallback(async (name: string, description?: string, type: ChatChannel['type'] = 'public') => {
    try {
      const newChannel: ChatChannel = {
        id: `channel-${Date.now()}`,
        name,
        description,
        type,
        members: [
          {
            userId: 'current-user',
            role: 'owner',
            joinedAt: new Date().toISOString(),
            permissions: {
              canPost: true,
              canInvite: true,
              canManage: true,
              canDelete: true
            },
            notifications: {
              enabled: true,
              mentions: true,
              all: false
            }
          }
        ],
        createdBy: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: 0,
        settings: {
          notifications: true,
          mentions: true,
          threadedReplies: true,
          messageRetention: 365
        },
        archived: false,
        pinned: false
      };

      setChannels(prev => [...prev, newChannel]);
      setMessages(prev => ({ ...prev, [newChannel.id]: [] }));
      
      addToast({
        type: 'success',
        title: 'Channel Created',
        description: `Channel "${name}" has been created successfully`,
        duration: 3000
      });

      return newChannel;
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Channel Creation Failed',
        description: 'Could not create channel',
        duration: 5000
      });
      return null;
    }
  }, [addToast]);

  return {
    channels,
    activeChannel,
    setActiveChannel,
    messages: activeChannel ? messages[activeChannel.id] || [] : [],
    onlineUsers,
    notifications,
    contexts,
    loading,
    connected,
    typing: activeChannel ? typing[activeChannel.id] || [] : [],
    sendMessage,
    addReaction,
    markAsRead,
    setUserTyping,
    markNotificationAsRead,
    createChannel,
    unreadNotifications: notifications.filter(n => !n.read).length,
    totalUnreadMessages: channels.reduce((sum, channel) => sum + channel.unreadCount, 0)
  };
}