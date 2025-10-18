// FIX: The 'error' parameter is typed as 'unknown' to safely handle various error types from catch blocks.
// This allows `unknown` error types from catch blocks to be passed directly.
export const getFriendlyErrorMessage = (error: unknown): string => {
  let errorObj: any = {};
  let rawMessage = "An unknown error occurred.";

  // Step 1: Normalize the error into a structured object and a raw message string.
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

  // Step 2: Extract details from the normalized error object.
  // The actual error details might be nested under an 'error' key.
  const nestedError = errorObj.error || errorObj;
  const detailedMessage = (nestedError.message || '').toLowerCase();
  const status = (nestedError.status || '').toLowerCase();

  // Step 3: Check for known error patterns in a specific order of precedence.
  
  // Quota and rate limit issues are the most common for users.
  if (detailedMessage.includes('quota') || detailedMessage.includes('rate limit') || status.includes('resource_exhausted')) {
    return "You have exceeded the daily usage quota for image generation. This is a limit of the free API. Please try again tomorrow.";
  }

  // API key configuration problems.
  if (detailedMessage.includes('api key') && (detailedMessage.includes('not found') || detailedMessage.includes('invalid'))) {
    return "Invalid API Key. Please ensure your API key is correctly configured.";
  }

  // Prompts that violate safety policies.
  if (detailedMessage.includes('safety') || detailedMessage.includes('blocked')) {
    return "Your prompt was blocked due to safety policies. Please modify your prompt and try again.";
  }
  
  // Billing issues (checked after quota, as quota messages can also mention billing).
  if (detailedMessage.includes('billing')) {
    return "There's an issue with your billing account. Please check your Google Cloud project settings to ensure billing is enabled.";
  }

  // Common client-side network problems.
  if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('fetch')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Internal app logic errors where the API call was successful but yielded no result.
  if (rawMessage.includes('no images were generated') || rawMessage.includes('no upscaled image was found')) {
    return "The AI couldn't generate an image for this request. It might be too restrictive or the input was unprocessable. Please try a different prompt or image.";
  }

  // Generic fallback for unhandled errors.
  console.error("Unhandled Gemini Error:", error);
  // Return the most specific message available, otherwise fall back to the raw message.
  return nestedError.message || rawMessage;
};