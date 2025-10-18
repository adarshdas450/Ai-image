// A helper to normalize different error shapes into a consistent object
const normalizeError = (error: unknown): { message: string, status: string, raw: string } => {
  let errorObj: any = {};
  let rawMessage = "An unknown error occurred.";

  if (error instanceof Error) {
    rawMessage = error.message;
    try {
      // Attempt to find and parse a JSON object within the error message string.
      const jsonMatch = rawMessage.match(/\{.*\}/s);
      if (jsonMatch && jsonMatch[0]) {
        errorObj = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parsing errors; we'll rely on the raw message.
    }
  } else if (typeof error === 'object' && error !== null) {
    errorObj = error;
    try {
      rawMessage = JSON.stringify(error);
    } catch {
        rawMessage = "An unstringifiable error object was received.";
    }
  } else if (typeof error === 'string') {
    rawMessage = error;
    try {
      // The string itself might be a JSON object.
      errorObj = JSON.parse(rawMessage);
    } catch {
       // Or it might contain a JSON object.
       try {
         const jsonMatch = rawMessage.match(/\{.*\}/s);
         if (jsonMatch && jsonMatch[0]) {
           errorObj = JSON.parse(jsonMatch[0]);
         }
       } catch {
         // Ignore parsing errors.
       }
    }
  }

  // The actual error details might be nested under an 'error' key.
  const nestedError = errorObj.error || errorObj;
  const detailedMessage = (nestedError.message || '').toLowerCase();
  const status = (nestedError.status || '').toLowerCase();
  
  return { message: detailedMessage, status, raw: nestedError.message || rawMessage };
};

/**
 * Checks if a given error object or string indicates a quota or rate limit issue.
 * @param error The error to check, typically from a catch block.
 * @returns True if the error is a quota error, false otherwise.
 */
export const isQuotaError = (error: unknown): boolean => {
    const normalized = normalizeError(error);
    return normalized.message.includes('quota') || normalized.message.includes('rate limit') || normalized.status.includes('resource_exhausted');
}

/**
 * Converts a raw error from an API call or internal process into a user-friendly string.
 * @param error The error to process, typically from a catch block.
 * @returns A user-friendly error message.
 */
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (isQuotaError(error)) {
    return "You have exceeded the daily usage quota for image generation. This is a limit of the free API. Please try again tomorrow.";
  }
  
  const normalized = normalizeError(error);

  if (normalized.message.includes('api key') && (normalized.message.includes('not found') || normalized.message.includes('invalid'))) {
    return "Invalid API Key. Please ensure your API key is correctly configured.";
  }
  
  if (normalized.message.includes('safety') || normalized.message.includes('blocked')) {
    return "Your prompt was blocked due to safety policies. Please modify your prompt and try again.";
  }
  
  if (normalized.message.includes('billing')) {
    return "There's an issue with your billing account. Please check your Google Cloud project settings to ensure billing is enabled.";
  }

  if (normalized.raw.toLowerCase().includes('network') || normalized.raw.toLowerCase().includes('fetch')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  if (normalized.raw.includes('no images were generated') || normalized.raw.includes('no upscaled image was found')) {
    return "The AI couldn't generate an image for this request. It might be too restrictive or the input was unprocessable. Please try a different prompt or image.";
  }

  console.error("Unhandled Gemini Error:", error);
  return normalized.raw;
};