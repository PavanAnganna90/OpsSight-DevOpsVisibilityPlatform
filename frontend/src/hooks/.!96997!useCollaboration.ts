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
