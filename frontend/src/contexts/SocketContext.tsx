import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('access_token')
        }
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to server');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from server');
      });

      newSocket.on('authenticated', (data) => {
        console.log('Authenticated with server');
      });

      newSocket.on('authentication_error', (data) => {
        console.error('Authentication error:', data);
        toast.error('Connection authentication failed');
      });

      // Trade notifications
      newSocket.on('trade:created', (data) => {
        toast.success(`New trade proposal from ${data.proposer_name || 'a DJ'}`);
      });

      newSocket.on('trade:updated', (data) => {
        const statusMessages = {
          accepted: 'Trade accepted!',
          declined: 'Trade declined',
          completed: 'Trade completed successfully!',
          cancelled: 'Trade was cancelled'
        };
        
        if (statusMessages[data.status as keyof typeof statusMessages]) {
          toast.success(statusMessages[data.status as keyof typeof statusMessages]);
        }
      });

      newSocket.on('trade:expired', (data) => {
        toast.error('Trade expired');
      });

      // Purchase notifications
      newSocket.on('purchase:completed', (data) => {
        toast.success(`Track sold for $${(data.amount_cents / 100).toFixed(2)}`);
      });

      // Track notifications
      newSocket.on('track:published', (data) => {
        toast.success('New track published!');
      });

      // User notifications
      newSocket.on('user:followed', (data) => {
        toast.success('You have a new follower!');
      });

      // Group notifications
      newSocket.on('group:invitation', (data) => {
        toast.success('You have been invited to a group!');
      });

      newSocket.on('member_joined', (data) => {
        toast.success('New member joined the group');
      });

      newSocket.on('member_left', (data) => {
        toast.info('Member left the group');
      });

      // Credits notifications
      newSocket.on('credits:updated', (data) => {
        toast.success(`Credits updated: ${data.delta > 0 ? '+' : ''}${data.delta} (Balance: ${data.balance})`);
      });

      // Reputation notifications
      newSocket.on('reputation:updated', (data) => {
        toast.success(`Reputation updated: ${data.delta > 0 ? '+' : ''}${data.delta} (New: ${data.reputation})`);
      });

      // System notifications
      newSocket.on('system:announcement', (data) => {
        toast(data.message, {
          duration: 6000,
          style: {
            background: '#3b82f6',
            color: '#fff'
          }
        });
      });

      // Chat messages
      newSocket.on('group_message', (data) => {
        // Handle group messages (you might want to show them in a chat UI)
        console.log('Group message:', data);
      });

      newSocket.on('chat_message', (data) => {
        // Handle direct messages
        console.log('Chat message:', data);
      });

      // Typing indicators
      newSocket.on('user_typing', (data) => {
        // Handle typing indicators
        console.log('User typing:', data);
      });

      newSocket.on('typing_indicator', (data) => {
        // Handle typing indicators
        console.log('Typing indicator:', data);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const joinGroup = (groupId: string) => {
    if (socket && isConnected) {
      socket.emit('join_group', { group_id: groupId });
    }
  };

  const leaveGroup = (groupId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_group', { group_id: groupId });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      sendMessage,
      joinGroup,
      leaveGroup
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
