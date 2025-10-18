const DB_NAME = 'AIImageForgeDB';
const STORE_NAME = 'imageHistory';
const DB_VERSION = 1;

interface ImageRecord {
  id: string;
  prompt: string;
  imageBlobs: Blob[];
  createdAt: string;
  quality?: string;
  style?: string;
  imageSize?: string;
  negativePrompt?: string;
}

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(new Error("Error opening IndexedDB."));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addImageToHistory = async (record: {
    id: string;
    prompt: string;
    imageUrls: string[];
    createdAt: string;
    quality?: string;
    style: string;
    imageSize: string;
    negativePrompt: string;
}) => {
    const { imageUrls, ...rest } = record;
    const db = await initDB();

    const imageBlobs = await Promise.all(
      imageUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        return response.blob();
      })
    );

    const recordToStore: ImageRecord = { ...rest, imageBlobs };

    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(recordToStore);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error adding record to DB:', request.error);
            reject(new Error(`Failed to save to IndexedDB: ${request.error?.name} - ${request.error?.message}`));
        };
    });
};

export const getHistory = async (): Promise<ImageRecord[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('Error fetching history from DB:', request.error);
            reject(new Error(`Failed to fetch from IndexedDB: ${request.error?.name} - ${request.error?.message}`));
        };
    });
};

export const deleteImageFromHistory = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error deleting record from DB:', request.error);
            reject(new Error(`Failed to delete from IndexedDB: ${request.error?.name} - ${request.error?.message}`));
        };
    });
};

export const clearHistoryDB = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error clearing history in DB:', request.error);
            reject(new Error(`Failed to clear IndexedDB store: ${request.error?.name} - ${request.error?.message}`));
        };
    });
};

export const getRandomHistoryItems = async (count: number): Promise<ImageRecord[]> => {
    const allHistory = await getHistory();
    if (allHistory.length === 0) {
        return [];
    }
    // Simple shuffle
    const shuffled = allHistory.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};