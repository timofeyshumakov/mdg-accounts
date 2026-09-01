import { computed, ref } from 'vue';

const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 80;
const MAX_ZOOM = 300;
const STEP = 5;

function createAppZoomState() {
  const zoom = ref(DEFAULT_ZOOM);

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
