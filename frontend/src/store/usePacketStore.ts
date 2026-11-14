import { create } from 'zustand';
import type { PingPlan, PingStep } from '../lib/ping/types';

export type PacketPlaybackMode = 'manual' | 'auto';

interface PacketStore {
  plan: PingPlan | null;
  currentStep: number;
  totalSteps: number;
  steps: PingStep[];
  isSimulating: boolean;
  isCompleted: boolean;
  isPlaying: boolean;
  isAnimating: boolean;
  playbackMode: PacketPlaybackMode;
  speed: number;
  rttMs: number | null;
  packetLoss: number;

  originNodeId: string | null;
  destNodeId: string | null;
  originNodeName: string | null;
  destNodeName: string | null;

  currentPath: string[];
  currentPathIndex: number;
  packetPath: [number, number, number][];
  packetColor: string;
  packetPosition: [number, number, number];
  packetTarget: [number, number, number];
  packetMoving: boolean;

  loadPingPlan: (plan: PingPlan, originName: string, destName: string) => void;
  setPlaybackMode: (mode: PacketPlaybackMode) => void;
  setSpeed: (speed: number) => void;
  play: () => void;
  pause: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeSimulation: () => void;
  resetSimulation: () => void;
  setPacketPosition: (pos: [number, number, number]) => void;
  setPacketTarget: (target: [number, number, number]) => void;
  setPacketMoving: (moving: boolean) => void;
  setPacketPath: (path: [number, number, number][]) => void;
  setPacketColor: (color: string) => void;
  setCurrentPath: (path: string[]) => void;
  setRtt: (ms: number) => void;
  setPacketLoss: (loss: number) => void;
}

export const usePacketStore = create<PacketStore>((set) => ({
  plan: null,
  currentStep: 1,
  totalSteps: 0,
  steps: [],
  isSimulating: false,
  isCompleted: false,
  isPlaying: false,
  isAnimating: false,
  playbackMode: 'manual',
  speed: 1,
  rttMs: null,
  packetLoss: 0,

  originNodeId: null,
  destNodeId: null,
  originNodeName: null,
  destNodeName: null,

  currentPath: [],
  currentPathIndex: 0,
  packetPath: [],
  packetColor: '#fbbf24',
  packetPosition: [0, 2, 0],
  packetTarget: [0, 2, 0],
  packetMoving: false,

  loadPingPlan: (plan, originName, destName) =>
    set({
      plan,
      currentStep: 1,
      totalSteps: plan.steps.length,
      steps: plan.steps,
      isSimulating: true,
      isCompleted: false,
      isPlaying: false,
      isAnimating: false,
      playbackMode: 'manual',
      speed: 1,
      rttMs: plan.rttMs,
      packetLoss: 0,
      originNodeId: plan.originId,
      destNodeId: plan.destId,
      originNodeName: originName,
      destNodeName: destName,
      currentPath: plan.path,
      currentPathIndex: 0,
      packetPath: [],
      packetColor: '#fbbf24',
      packetPosition: [0, 2, 0],
      packetTarget: [0, 2, 0],
      packetMoving: false,
    }),

  setPlaybackMode: (playbackMode) => set({ playbackMode }),
  setSpeed: (speed) => set({ speed }),
  play: () => set({ isPlaying: true, playbackMode: 'auto' }),
  pause: () => set({ isPlaying: false }),

  nextStep: () =>
    set((state) => {
      if (!state.plan) return state;
      if (state.currentStep >= state.totalSteps) {
        return {
          isCompleted: true,
          isSimulating: false,
          isPlaying: false,
          isAnimating: false,
          packetMoving: false,
        };
      }
      return {
        currentStep: state.currentStep + 1,
        isAnimating: true,
        packetMoving: true,
      };
    }),

  previousStep: () =>
    set((state) => {
      if (state.currentStep <= 1) return state;
      return {
        currentStep: state.currentStep - 1,
        isAnimating: true,
        packetMoving: true,
      };
    }),

  goToStep: (step) =>
    set((state) => {
      if (!state.plan) return state;
      const currentStep = Math.min(Math.max(1, step), state.totalSteps);
      return {
        currentStep,
        isAnimating: true,
        packetMoving: true,
      };
    }),

  completeSimulation: () =>
    set({
      isCompleted: true,
      isSimulating: false,
      isPlaying: false,
      isAnimating: false,
      packetMoving: false,
    }),

  resetSimulation: () =>
    set({
      plan: null,
      currentStep: 1,
      totalSteps: 0,
      steps: [],
      isSimulating: false,
      isCompleted: false,
      isPlaying: false,
      isAnimating: false,
      playbackMode: 'manual',
      speed: 1,
      rttMs: null,
      packetLoss: 0,
      originNodeId: null,
      destNodeId: null,
      originNodeName: null,
      destNodeName: null,
      currentPath: [],
      currentPathIndex: 0,
      packetPath: [],
      packetColor: '#fbbf24',
      packetPosition: [0, 2, 0],
      packetTarget: [0, 2, 0],
      packetMoving: false,
    }),

  setPacketPosition: (packetPosition) => set({ packetPosition }),
  setPacketTarget: (packetTarget) => set({ packetTarget }),
  setPacketMoving: (packetMoving) => set({ packetMoving }),
  setPacketPath: (packetPath) => set({ packetPath }),
  setPacketColor: (packetColor) => set({ packetColor }),
  setCurrentPath: (currentPath) => set({ currentPath }),
  setRtt: (rttMs) => set({ rttMs }),
  setPacketLoss: (packetLoss) => set({ packetLoss }),
}));
