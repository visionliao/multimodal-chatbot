'use client';

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Room } from 'livekit-client';
import {
  RoomEvent,
  type RemoteParticipant
} from 'livekit-client';
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
  // 本地参与者
  connected: boolean;
  //（远程参与者）是否已连接
  isAgentConnected: boolean;
  // 聊天就绪状态，只有当本地参与者和远程参与者都连接成功，才能表示聊天状态就绪
  isReadyToChat: boolean;
  connectRoom: () => Promise<void>;
};

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function useLiveKit() {
  const ctx = useContext(LiveKitContext);
  if (!ctx) throw new Error('useLiveKit must be used within LiveKitProvider');
  return ctx;
}

export function LiveKitProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState(() => new Room());
  const [connected, setConnected] = useState(false);
  const { connectionDetails, refreshConnectionDetails } = useConnectionDetails();
  const [isAgentConnected, setIsAgentConnected] = useState(false);

  // 2. 将连接逻辑封装到一个 effect 中，当 room 实例或 connectionDetails 变化时触发
  useEffect(() => {
    if (connectionDetails && room.state === 'disconnected') {
      console.log("[useEffect] New room instance or connection details detected. Connecting...");
      room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
        .then(() => {
            console.log("[useEffect] Connection process initiated successfully.");
        })
        .catch((error: any) => {
            console.error('[useEffect] Connection failed:', error);
            toastAlert({ title: 'LiveKit 连接失败', description: error.message });
        });
    }
  }, [room, connectionDetails]); // 依赖 room 实例和连接详情

  // 连接房间
  const connectRoom = useCallback(async () => {
    console.log('LiveKitProvider connectRoom');
    if (!connectionDetails) {
        console.warn('[connectRoom] Aborted: No connection details.');
        // 尝试刷新一次
        refreshConnectionDetails();
        return;
    }
    console.log(`%c[DEBUG] Curr Room Connection State: %c${room.state}`, 'color: black;', `color: ${room.state === 'connected' ? 'green' : 'orange'}; font-weight: bold;`);
    // Case 1: 正在连接中，什么都不做，防止重复调用
    if (room.state === 'connecting') {
      console.log("[connectRoom] Action: Aborted. Already in 'connecting' state.");
      return;
    }

    // Case 2: 本地已连接，但Agent未连接 (这是您指出的核心场景)
    // 此时需要“刷新”会话，以重新触发后端Agent的加入逻辑
    if (room.state === 'connected' && !isAgentConnected) {
      console.log("[connectRoom] Action: Reconnecting. Local is connected but agent is missing. Disconnecting first...");
      await room.disconnect();
      // 创建一个全新的 Room 实例并更新 state
      // 这会触发上面的 useEffect 来执行连接
      setRoom(new Room());
      return;
    }

    // Case 3: 已经是完美状态 (本地和Agent都已连接)
    // 正常情况下不应触发，但作为保护逻辑
    if (room.state === 'connected' && isAgentConnected) {
      console.log("[connectRoom] Action: Aborted. Already fully connected.");
      return;
    }

    // Case 4: 初始连接或断开后的重连 (此时 room.state 必然是 'disconnected')
    if (room.state === 'disconnected') {
      if (!connectionDetails) {
        console.warn('[connectRoom] Action: Aborted. No connection details available.');
        return;
      }
      console.log("[connectRoom] Action: Connecting...");
      try {
        await room.connect(connectionDetails.serverUrl, connectionDetails.participantToken);
        // 连接成功后，`connected` state 会由 RoomEvent.ConnectionStateChanged 监听器自动更新
        console.log("[connectRoom] Connection process initiated successfully.");
      } catch (error: any) {
        console.error('[connectRoom] Connection failed:', error);
        toastAlert({ title: 'LiveKit 连接失败', description: error.message });
      }
    }
  }, [room, connectionDetails, isAgentConnected]);

  useEffect(() => {
    // --- 1. 本地房间连接状态事件 ---
    const handleConnectionStateChange = () => {
      const state = room.state;
      setConnected(state === 'connected');
      console.log(`%c[DEBUG] Room Connection State Changed: %c${state}`, 'color: black;', `color: ${state === 'connected' ? 'green' : 'orange'}; font-weight: bold;`);
      if (state === 'disconnected') {
        setIsAgentConnected(false);
        refreshConnectionDetails();
      }
      if (state === 'connected') {
        refreshConnectionDetails();
          console.groupCollapsed('%c[DEBUG] Room Connected Details', 'color: green; font-weight: bold;');
          console.log('Local Participant SID:', room.localParticipant.sid);
          console.log('Room Name:', room.name);
          console.log('Full Room Object:', room);
          if (room.remoteParticipants.size > 0) {
              console.log('Remote participants already in room:', Array.from(room.remoteParticipants.values()).map(p => p.identity));
          } else {
              console.log('Waiting for remote participant (Agent) to join...');
          }
          console.groupEnd();
      }
    };

    // --- 2. 远程参与者连接成功事件 ---
    const handleParticipantConnected = (participant: RemoteParticipant) => {
        console.groupCollapsed(`%c[EVENT] Participant Connected: %c${participant.identity}`, 'color: blue; font-weight: bold;', 'color: black;');
        console.log('Participant SID:', participant.sid);
        console.groupEnd();
        setIsAgentConnected(true);
    };

    // --- 3. 远程参与者连接失败事件 ---
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
        console.groupCollapsed(`%c[EVENT] Participant Disconnected: %c${participant.identity}`, 'color: lightcoral; font-weight: bold;', 'color: black;');
        console.log('Participant SID:', participant.sid);
        console.groupEnd();
        setIsAgentConnected(false);
    };

    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: '设备权限错误',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    // --- 初始状态检查 ---
    handleConnectionStateChange();
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
      // 当组件卸载时，确保断开连接
      if (room.state !== 'disconnected') {
        room.disconnect();
      }
    };
  }, [room, refreshConnectionDetails]);

  // 计算最终的“就绪状态”
  const isReadyToChat = useMemo(() => connected && isAgentConnected, [connected, isAgentConnected]);
  const value = {
      room,
      connected,
      isAgentConnected,
      isReadyToChat, // 暴露这个统一状态
      connectRoom
  };

  return (
    <LiveKitContext.Provider value={value}>
      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        {children}
      </RoomContext.Provider>
    </LiveKitContext.Provider>
  );
}