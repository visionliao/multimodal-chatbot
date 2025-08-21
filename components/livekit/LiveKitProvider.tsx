'use client';

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import { toastAlert } from '../ui/alert-toast';

export type Message = {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type: "text" | "file" | "audio";
  fileName?: string;
};

type LiveKitContextType = {
  room: Room;
  connected: boolean;
  connectRoom: () => void;
};

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function useLiveKit() {
  const ctx = useContext(LiveKitContext);
  if (!ctx) throw new Error('useLiveKit must be used within LiveKitProvider');
  return ctx;
}

export function LiveKitProvider({ children }: { children: React.ReactNode }) {
  const room = useMemo(() => new Room(), []);
  const [connected, setConnected] = useState(false);
  const { connectionDetails, refreshConnectionDetails } = useConnectionDetails();

  // 连接房间
  const connectRoom = useCallback(() => {
    console.log('LiveKitProvider connectRoom');
    if (!connectionDetails) return;
    console.log(`%c[DEBUG] Curr Room Connection State: %c${room.state}`, 'color: black;', `color: ${room.state === 'connected' ? 'green' : 'orange'}; font-weight: bold;`);
    if (room.state !== 'disconnected') return;
    room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
      .then(() => setConnected(true))
      .catch((error) => {
        toastAlert({ title: 'LiveKit 连接失败', description: error.message });
      });
  }, [room, connectionDetails]);

  useEffect(() => {
    const onDisconnected = () => {
      setConnected(false);
      refreshConnectionDetails();
    };
    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: '设备权限错误',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room, refreshConnectionDetails]);

  return (
    <LiveKitContext.Provider value={{ room, connected, connectRoom }}>
      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        {children}
      </RoomContext.Provider>
    </LiveKitContext.Provider>
  );
}