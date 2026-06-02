const LOCAL_IMAGE_DB_NAME = 'ln_local_image_library';
const LOCAL_IMAGE_DB_VERSION = 1;
const LOCAL_IMAGE_STORE = 'images';
const DEFAULT_MAX_EDGE = 1600;
const JPEG_QUALITY = 0.86;

export const LOCAL_IMAGE_URI_PREFIX = 'ln-local-image://';

export interface LocalImageAssetRecord {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  dataUrl: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;
const dataUrlCache = new Map<string, string>();

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });

const withStore = async <T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => Promise<T>): Promise<T> => {
  const db = await openLocalImageDb();
  const transaction = db.transaction(LOCAL_IMAGE_STORE, mode);
  const store = transaction.objectStore(LOCAL_IMAGE_STORE);
  const result = await handler(store);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
  });
  return result;
};

const openLocalImageDb = (): Promise<IDBDatabase> => {
  if (!isBrowser()) {
    return Promise.reject(new Error('当前环境不支持本地图片库。'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(LOCAL_IMAGE_DB_NAME, LOCAL_IMAGE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LOCAL_IMAGE_STORE)) {
          db.createObjectStore(LOCAL_IMAGE_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开本地图片库。'));
    });
  }
  return dbPromise;
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ''}`);
    reader.onerror = () => reject(reader.error || new Error('图片读取失败。'));
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败。'));
    image.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('图片压缩失败。'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });

const normalizeMimeType = (file: File): string => {
  if (file.type === 'image/png') return 'image/png';
  if (file.type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
};

const fitSize = (width: number, height: number, maxEdge = DEFAULT_MAX_EDGE): { width: number; height: number } => {
  const safeWidth = Math.max(1, Math.round(width || 1));
  const safeHeight = Math.max(1, Math.round(height || 1));
  const longest = Math.max(safeWidth, safeHeight);
  if (longest <= maxEdge) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
};

const optimizeLocalImageFile = async (
  file: File,
): Promise<Pick<LocalImageAssetRecord, 'mimeType' | 'byteSize' | 'width' | 'height' | 'dataUrl'>> => {
  const originalDataUrl = await readBlobAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const nextSize = fitSize(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement('canvas');
  canvas.width = nextSize.width;
  canvas.height = nextSize.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器无法处理本地图像。');
  }
  ctx.drawImage(image, 0, 0, nextSize.width, nextSize.height);
  const mimeType = normalizeMimeType(file);
  const blob = await canvasToBlob(
    canvas,
    mimeType,
    mimeType === 'image/jpeg' || mimeType === 'image/webp' ? JPEG_QUALITY : undefined,
  );
  const dataUrl = await readBlobAsDataUrl(blob);
  return {
    mimeType,
    byteSize: blob.size,
    width: nextSize.width,
    height: nextSize.height,
    dataUrl,
  };
};

export const isLocalImageUri = (value?: string | null): boolean =>
  `${value || ''}`.trim().startsWith(LOCAL_IMAGE_URI_PREFIX);

export const parseLocalImageUri = (value?: string | null): string | null => {
  const text = `${value || ''}`.trim();
  if (!text.startsWith(LOCAL_IMAGE_URI_PREFIX)) return null;
  const id = text.slice(LOCAL_IMAGE_URI_PREFIX.length).trim();
  return id || null;
};

export const buildLocalImageUri = (assetId: string): string => `${LOCAL_IMAGE_URI_PREFIX}${assetId}`;

export const getLocalImageAsset = async (assetId: string): Promise<LocalImageAssetRecord | null> =>
  withStore('readonly', store =>
    requestToPromise(store.get(assetId)).then(result => (result as LocalImageAssetRecord | undefined) || null),
  );

export const resolveLocalImageSource = async (src?: string | null): Promise<string> => {
  const text = `${src || ''}`.trim();
  if (!text) return '';
  const localId = parseLocalImageUri(text);
  if (!localId) return text;
  const cached = dataUrlCache.get(localId);
  if (cached) return cached;
  const asset = await getLocalImageAsset(localId);
  if (!asset?.dataUrl) return '';
  dataUrlCache.set(localId, asset.dataUrl);
  return asset.dataUrl;
};

export const listLocalImageAssets = async (limit = 24): Promise<LocalImageAssetRecord[]> => {
  const items = await withStore('readonly', store =>
    requestToPromise(store.getAll()).then(result => (Array.isArray(result) ? (result as LocalImageAssetRecord[]) : [])),
  );
  return items
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || ''))
    .slice(0, Math.max(1, limit))
    .map(item => {
      dataUrlCache.set(item.id, item.dataUrl);
      return item;
    });
};

export const saveLocalImageFile = async (file: File): Promise<LocalImageAssetRecord> => {
  const timestamp = new Date().toISOString();
  const optimized = await optimizeLocalImageFile(file);
  const asset: LocalImageAssetRecord = {
    id: `local_image_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    fileName: file.name || `local_image_${Date.now()}.jpg`,
    mimeType: optimized.mimeType,
    byteSize: optimized.byteSize,
    width: optimized.width,
    height: optimized.height,
    createdAt: timestamp,
    updatedAt: timestamp,
    dataUrl: optimized.dataUrl,
  };
  await withStore('readwrite', store => requestToPromise(store.put(asset)).then(() => asset));
  dataUrlCache.set(asset.id, asset.dataUrl);
  return asset;
};
