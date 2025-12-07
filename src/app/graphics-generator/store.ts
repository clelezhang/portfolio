import { create } from 'zustand';
import { AppState, Layer, AsciiLayer, GradientLayer, GridLayer, HistoryActions } from './types';
import { randomColor } from './constants';

type StoreState = AppState & {
  // Layer actions
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  setSelectedLayer: (id: string, isShiftKey?: boolean) => void;
  
  // Canvas actions
  setCanvasSize: (width: number, height: number) => void;
  setCanvasBackground: (background: string) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Randomize
  randomizeLayer: (id: string) => void;
  randomizeSelected: () => void;
  randomizeAll: () => void;
  
  // Export helpers
  getState: () => AppState;
};

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialState: AppState = {
  canvas: { width: 800, height: 600, background: '#FFFFFF' },
  layers: [],
  selectedLayerIds: [],
  history: {
    past: [],
    future: [],
  },
};

const saveToHistory = (state: StoreState): void => {
  const { canvas, layers, selectedLayerIds } = state;
  const snapshot = { canvas, layers, selectedLayerIds };
  
  state.history.past.push(snapshot);
  state.history.future = [];
  
  // Limit history to 50 states
  if (state.history.past.length > 50) {
    state.history.past.shift();
  }
};

export const useStore = create<StoreState>((set, get) => ({
  ...initialState,
  
  addLayer: (layer) => {
    set((state) => {
      saveToHistory(state);
      return {
        layers: [...state.layers, layer],
        selectedLayerIds: [layer.id],
      };
    });
  },
  
  updateLayer: (id, updates) => {
    set((state) => {
      saveToHistory(state);
      return {
        layers: state.layers.map((layer) =>
          layer.id === id ? { ...layer, ...updates } as Layer : layer
        ),
      };
    });
  },
  
  deleteLayer: (id) => {
    set((state) => {
      saveToHistory(state);
      const newLayers = state.layers.filter((layer) => layer.id !== id);
      const newSelectedIds = state.selectedLayerIds.filter((selectedId) => selectedId !== id);
      
      // If no layers selected after deletion and there are layers, select the last one
      if (newSelectedIds.length === 0 && newLayers.length > 0) {
        newSelectedIds.push(newLayers[newLayers.length - 1].id);
      }
      
      return {
        layers: newLayers,
        selectedLayerIds: newSelectedIds,
      };
    });
  },
  
  duplicateLayer: (id) => {
    set((state) => {
      saveToHistory(state);
      const layer = state.layers.find((l) => l.id === id);
      if (!layer) return {};
      
      const newLayer = { ...layer, id: generateId(), name: `${layer.name} Copy` } as Layer;
      const index = state.layers.findIndex((l) => l.id === id);
      const newLayers = [...state.layers];
      newLayers.splice(index + 1, 0, newLayer);
      
      return {
        layers: newLayers,
        selectedLayerIds: [newLayer.id],
      };
    });
  },
  
  moveLayer: (id, direction) => {
    set((state) => {
      saveToHistory(state);
      const index = state.layers.findIndex((l) => l.id === id);
      if (index === -1) return state;
      
      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= state.layers.length) return state;
      
      const newLayers = [...state.layers];
      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      
      return { layers: newLayers };
    });
  },
  
  reorderLayers: (fromIndex: number, toIndex: number) => {
    set((state) => {
      saveToHistory(state);
      const newLayers = [...state.layers];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return { layers: newLayers };
    });
  },
  
  setSelectedLayer: (id, isShiftKey = false) => {
    set((state) => {
      if (isShiftKey) {
        // Toggle selection with shift key
        const isAlreadySelected = state.selectedLayerIds.includes(id);
        if (isAlreadySelected) {
          // Don't allow deselecting if it's the only selected layer
          if (state.selectedLayerIds.length > 1) {
            return {
              selectedLayerIds: state.selectedLayerIds.filter((selectedId) => selectedId !== id) as string[],
            };
          }
          return {};
        } else {
          return {
            selectedLayerIds: [...state.selectedLayerIds, id] as string[],
          };
        }
      } else {
        // Normal click - select only this layer
        return {
          selectedLayerIds: [id] as string[],
        };
      }
    });
  },
  
  setCanvasSize: (width, height) => {
    set((state) => {
      saveToHistory(state);
      return {
        canvas: { ...state.canvas, width, height },
      };
    });
  },
  
  setCanvasBackground: (background) => {
    set((state) => {
      saveToHistory(state);
      return {
        canvas: { ...state.canvas, background },
      };
    });
  },
  
  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return state;
      
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      const current = {
        canvas: state.canvas,
        layers: state.layers,
        selectedLayerIds: state.selectedLayerIds,
      };
      
      return {
        ...previous,
        history: {
          past: newPast,
          future: [current, ...state.history.future],
        },
      };
    });
  },
  
  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return state;
      
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      const current = {
        canvas: state.canvas,
        layers: state.layers,
        selectedLayerIds: state.selectedLayerIds,
      };
      
      return {
        ...next,
        history: {
          past: [...state.history.past, current],
          future: newFuture,
        },
      };
    });
  },
  
  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
  
  randomizeLayer: (id) => {
    const state = get();
    const layer = state.layers.find((l) => l.id === id);
    if (!layer) return;
    
    let updates: Partial<Layer> = {};
    
    if (layer.type === 'ascii') {
      const charSets = ['numbers', 'normal', 'custom'] as const;
      const ditheringTypes = ['random', '2x2', '4x4', '8x8'] as const;
      updates = {
        charSet: charSets[Math.floor(Math.random() * charSets.length)],
        color: randomColor(),
        dithering: {
          ...layer.dithering,
          type: ditheringTypes[Math.floor(Math.random() * ditheringTypes.length)],
          colorSteps: Math.floor(Math.random() * 15) + 2,
        },
      };
    } else if (layer.type === 'gradient') {
      const gradLayer = layer as GradientLayer;
      updates = {
        colors: gradLayer.colors.map(() => randomColor()),
        distortion: Math.random(),
        swirl: Math.random(),
      };
    } else if (layer.type === 'grid') {
      updates = {
        lineColor: randomColor(),
        columns: Math.floor(Math.random() * 20) + 5,
        rows: Math.floor(Math.random() * 20) + 5,
      };
    }
    
    state.updateLayer(id, updates);
  },
  
  randomizeSelected: () => {
    const state = get();
    state.selectedLayerIds.forEach((id) => {
      state.randomizeLayer(id);
    });
  },
  
  randomizeAll: () => {
    const state = get();
    state.layers.forEach((layer) => {
      state.randomizeLayer(layer.id);
    });
  },
  
  getState: () => {
    const state = get();
    return {
      canvas: state.canvas,
      layers: state.layers,
      selectedLayerIds: state.selectedLayerIds,
      history: state.history,
    };
  },
}));

// Helper functions to create new layers
export const createAsciiLayer = (name: string = 'ASCII Layer'): AsciiLayer => {
  // Create a default placeholder image (white square)
  const img = new Image();
  img.width = 100;
  img.height = 100;
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 100, 100);
  }
  img.src = canvas.toDataURL();
  
  return {
    id: generateId(),
    type: 'ascii',
    name,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    source: { img },
    charSet: 'normal',
    charSize: 8, // Smaller default since we're mapping 1:1 with dithered pixels
    lineHeight: 1.0,
    letterSpacing: 0,
    color: randomColor(),
    glow: { enabled: false, radius: 0, intensity: 0 },
    offset: { x: 0, y: 0 },
    dithering: {
      type: '8x8',
      colorSteps: 12, // More steps for smoother gradations
      pixelSize: 1, // Each pixel = one character
      originalColors: true, // Use original image colors by default
      colorFront: '#ffffff',
      colorBack: '#000000',
      colorHighlight: '#ffffff',
      animate: false,
      animationSpeed: 1.0,
      blur: 0, // No blur by default
      stretchX: 1, // No stretch by default
      stretchY: 1, // No stretch by default
    },
    showDitherOnly: false,
    reverseCharacterMapping: false,
  };
};

export const createGradientLayer = (name: string = 'Gradient Layer'): GradientLayer => ({
  id: generateId(),
  type: 'gradient',
  name,
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  colors: [randomColor(), randomColor(), randomColor(), randomColor()],
  colorBack: '#000000',
  softness: 1, // Smooth gradients
  intensity: 0.08, // Fixed as requested
  noise: 0, // Fixed as requested
  shape: 'wave',
  speed: 1,
  scale: 1, // Fixed as requested
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
});

export const createGridLayer = (name: string = 'Grid Layer'): GridLayer => ({
  id: generateId(),
  type: 'grid',
  name,
  visible: true,
  opacity: 1,
  blendMode: 'normal',
  columns: 10,
  rows: 10,
  lineColor: randomColor(),
  lineWidth: 1,
});

