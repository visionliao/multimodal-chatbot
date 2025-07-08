'use client';

import { useEffect, useMemo, useState, createContext, useContext, useCallback } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import { toastAlert } from '../ui/alert-toast';


export function LiveKitProvider({ children }: { children: React.ReactNode }) {
    const room = useMemo(() => new Room(), []);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [messages, setMessages] = useState([]);
    const { connectionDetails, refreshConnectionDetails } = useConnectionDetails();

    useEffect(() => {
      const onDisconnected = () => {
          setSessionStarted(false);
          refreshConnectionDetails();
        };
        const onMediaDevicesError = (error: Error) => {
          toastAlert({
            title: 'Encountered an error with your media devices',
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

      useEffect(() => {
        if (sessionStarted && room.state === 'disconnected' && connectionDetails) {
          Promise.all([
            room.connect(connectionDetails.serverUrl, connectionDetails.participantToken),
          ]).catch((error) => {
            toastAlert({
              title: 'There was an error connecting to the agent',
              description: `${error.name}: ${error.message}`,
            });
          });
        }
        return () => {
          room.disconnect();
        };
      }, [room, sessionStarted, connectionDetails, true]);

      // 控制麦克风
      const setMicrophone = useCallback(async (enabled: boolean) => {
        if (!room) return;
        try {
          await room.localParticipant.setMicrophoneEnabled(enabled);
          toastAlert({ title: enabled ? '麦克风已开启' : '麦克风已关闭', description: '' });
        } catch (e: any) {
          toastAlert({ title: '麦克风操作失败', description: e?.message || '' });
        }
      }, [room]);

      return (
        <>
          <RoomContext.Provider value={room}>
            <RoomAudioRenderer />
            <StartAudio label="Start Audio" />
            {/* --- */}
          </RoomContext.Provider>
        </>
      );
}