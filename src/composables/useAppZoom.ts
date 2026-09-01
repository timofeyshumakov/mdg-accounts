import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'mdg-accounts-app-zoom';
const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 80;
const MAX_ZOOM = 300;
const STEP = 5;

function readStoredZoom(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_ZOOM;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ZOOM;
  }

  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(parsed / STEP) * STEP));
}

function createAppZoomState() {
  const zoom = ref(readStoredZoom());

  watch(zoom, (value) => {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  });

  const zoomStyle = computed(() => ({
    zoom: zoom.value / 100,
  }));

  return {
    zoom,
    zoomStyle,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    step: STEP,
  };
}

let appZoomState: ReturnType<typeof createAppZoomState> | null = null;

export function useAppZoom() {
  if (!appZoomState) {
    appZoomState = createAppZoomState();
  }

  return appZoomState;
}
