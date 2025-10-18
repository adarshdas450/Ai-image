import { GoogleGenAI, Modality } from "@google/genai";

export const generateImage = async (prompt: string, aspectRatio: string, negativePrompt?: string): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const config: {
      numberOfImages: number;
      outputMimeType: string;
      aspectRatio: string;
      negativePrompt?: string;
    } = {
      numberOfImages: 2,
      outputMimeType: 'image/png',
      aspectRatio: aspectRatio,
    };

    if (negativePrompt) {
      config.negativePrompt = negativePrompt;
    }
    
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: config,
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      // Map over the generated images and return an array of base64 strings
      const base64ImageBytesArray: string[] = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
      return base64ImageBytesArray;
    } else {
      throw new Error("The AI returned a valid response, but no images were generated. This might be due to a very restrictive prompt.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    // Rethrow the original error to allow for more specific handling in the UI component.
    throw error;
  }
};

export const upscaleImage = async (base64ImageDataUrl: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const match = base64ImageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match || match.length !== 3) {
    throw new Error("Invalid base64 image data URL format");
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: 'Upscale this image to a higher resolution. Enhance details and clarity without altering the subject or style of the image.',
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const upscaledBase64 = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${upscaledBase64}`;
      }
    }
    
    throw new Error("The AI returned a valid response, but no upscaled image was found.");
  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
};