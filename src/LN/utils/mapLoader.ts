import qilingMapData from '../public/ln-maps/qiling.json';
import { WorldNodeMapData } from '../types';
import { normalizeWorldNodeMap } from './mapData';

export const createEmptyWorldMap = (): WorldNodeMapData => ({
  map: { regions: [] },
});

export const isWorldMapEmpty = (map: WorldNodeMapData | null | undefined): boolean =>
  !map || !map.map || !Array.isArray(map.map.regions) || map.map.regions.length === 0;

export const loadDefaultQilingMap = async (): Promise<WorldNodeMapData> => {
  try {
    const normalized = normalizeWorldNodeMap(qilingMapData);
    if (!normalized) throw new Error('invalid map schema');
    return normalized;
  } catch (error) {
    console.warn('Failed to load default qiling map, fallback to empty map:', error);
    return createEmptyWorldMap();
  }
};
