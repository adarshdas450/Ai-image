const CREDIT_STORAGE_KEY = 'ai-image-forge-credits';
const QUOTA_STORAGE_KEY = 'ai-image-forge-quotas';
const DAILY_CREDIT_AMOUNT = 10;

interface CreditData {
  credits: number;
  lastReset: string; // ISO date string (yyyy-mm-dd)
}

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getCreditData = (): CreditData => {
  try {
    const data = localStorage.getItem(CREDIT_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to parse credit data from localStorage", error);
  }
  // Default data if none exists or it's corrupted
  return {
    credits: DAILY_CREDIT_AMOUNT,
    lastReset: getTodayDateString(),
  };
};

const saveCreditData = (data: CreditData) => {
  try {
    localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save credit data to localStorage", error);
  }
};

export const setCreditsToZero = async (): Promise<void> => {
    return new Promise(resolve => {
        let data = getCreditData();
        data.credits = 0;
        saveCreditData(data);
        resolve();
    });
};

export const getCreditBalance = async (): Promise<number> => {
  return new Promise(resolve => {
    let data = getCreditData();
    const today = getTodayDateString();

    if (data.lastReset !== today) {
      // It's a new day, reset credits
      data = {
        credits: DAILY_CREDIT_AMOUNT,
        lastReset: today,
      };
      saveCreditData(data);
    }
    
    resolve(data.credits);
  });
};

export const useCredits = async (amount: number): Promise<number> => {
    return new Promise((resolve, reject) => {
        let data = getCreditData();
        const today = getTodayDateString();
        
        // Double-check for daily reset in case getCreditBalance wasn't called
        if (data.lastReset !== today) {
            data = {
                credits: DAILY_CREDIT_AMOUNT,
                lastReset: today,
            };
        }

        if (data.credits < amount) {
            return reject(new Error("Not enough credits."));
        }

        data.credits -= amount;
        saveCreditData(data);
        resolve(data.credits);
    });
};

// --- START: New Quota Management Logic ---

interface QuotaData {
  [modelName: string]: string; // value will be the ISO date string (yyyy-mm-dd) when it was exhausted
}

const getQuotaData = (): QuotaData => {
  try {
    const data = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to parse quota data from localStorage", error);
  }
  return {};
};

const saveQuotaData = (data: QuotaData) => {
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save quota data to localStorage", error);
  }
};

/**
 * Checks if a model's daily API quota has been reported as exhausted.
 * Also cleans up outdated entries.
 * @param modelName The name of the model to check.
 * @returns True if the model's quota was exhausted today, false otherwise.
 */
export const isModelQuotaExhausted = (modelName: string): boolean => {
  const data = getQuotaData();
  const today = getTodayDateString();
  
  const cleanedData: QuotaData = {};
  let changed = false;
  for (const model in data) {
    if(data[model] === today) {
        cleanedData[model] = data[model];
    } else {
        changed = true;
    }
  }
  
  if (changed) {
      saveQuotaData(cleanedData);
  }

  return cleanedData[modelName] === today;
};

/**
 * Marks a model's daily API quota as exhausted for the current day.
 * @param modelName The name of the model to mark.
 */
export const setModelQuotaExhausted = (modelName: string): void => {
  const data = getQuotaData();
  const today = getTodayDateString();
  data[modelName] = today;
  saveQuotaData(data);
};

// --- END: New Quota Management Logic ---
