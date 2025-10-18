const CREDIT_STORAGE_KEY = 'ai-image-forge-credits';
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
