import { create } from 'zustand';

export type ViewMode = 'arquitecto' | 'ciudad' | 'estructura' | 'planos';

interface ViewState {
  activeBranchId: string | null;
  setActiveBranch: (branchId: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeFloor: number | null;
  setActiveFloor: (floor: number | null) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;
  selectedEnlaceId: string | null;
  setSelectedEnlaceId: (enlaceId: string | null) => void;
  hoveredNodeId: string | null;
  setHoveredNodeId: (nodeId: string | null) => void;
  focusNodeId: string | null;
  focusNode: (nodeId: string | null) => void;
  showCables: boolean;
  toggleCables: () => void;
  showCoverage: boolean;
  toggleCoverage: () => void;
  showLabels: boolean;
  toggleLabels: () => void;
  showPeople: boolean;
  togglePeople: () => void;
  showTrees: boolean;
  toggleTrees: () => void;
  showDecor: boolean;
  toggleDecor: () => void;
  sectionCut: number | null;
  setSectionCut: (height: number | null) => void;
  followPacket: boolean;
  setFollowPacket: (valor: boolean) => void;
  toggleFollowPacket: () => void;
  pingOriginId: string | null;
  pingDestId: string | null;
  pingRequestToken: number;
  requestPing: (originId: string | null, destId: string | null) => void;
  clearPingRequest: () => void;
  cameraTarget: [number, number, number];
  setCameraTarget: (target: [number, number, number]) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  activeBranchId: 'bogota',
  setActiveBranch: (activeBranchId) => set({ activeBranchId }),
  viewMode: 'ciudad',
  setViewMode: (viewMode) => set({ viewMode }),
  activeFloor: null,
  setActiveFloor: (activeFloor) => set({ activeFloor }),
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  selectedEnlaceId: null,
  setSelectedEnlaceId: (selectedEnlaceId) => set({ selectedEnlaceId }),
  hoveredNodeId: null,
  setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),
  focusNodeId: null,
  focusNode: (focusNodeId) => set({ focusNodeId }),
  showCables: true,
  toggleCables: () => set((state) => ({ showCables: !state.showCables })),
  showCoverage: false,
  toggleCoverage: () => set((state) => ({ showCoverage: !state.showCoverage })),
  showLabels: true,
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  showPeople: true,
  togglePeople: () => set((state) => ({ showPeople: !state.showPeople })),
  showTrees: true,
  toggleTrees: () => set((state) => ({ showTrees: !state.showTrees })),
  showDecor: true,
  toggleDecor: () => set((state) => ({ showDecor: !state.showDecor })),
  sectionCut: null,
  setSectionCut: (sectionCut) => set({ sectionCut }),
  followPacket: true,
  setFollowPacket: (followPacket) => set({ followPacket }),
  toggleFollowPacket: () => set((state) => ({ followPacket: !state.followPacket })),
  pingOriginId: null,
  pingDestId: null,
  pingRequestToken: 0,
  requestPing: (pingOriginId, pingDestId) =>
    set((state) => ({
      pingOriginId,
      pingDestId,
      pingRequestToken: state.pingRequestToken + 1,
    })),
  clearPingRequest: () => set({ pingOriginId: null, pingDestId: null }),
  cameraTarget: [0, 0, 0],
  setCameraTarget: (cameraTarget) => set({ cameraTarget }),
}));
