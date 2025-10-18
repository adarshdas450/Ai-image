
import { GoogleGenAI, Modality } from "@google/genai";

export const generateImage = async (prompt: string, aspectRatio: string, numberOfImages: number, negativePrompt?: string, inputImageUrl?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (inputImageUrl) {
    // ---- Image + Text Generation using gemini-2.5-flash-image ----
    try {
      const match = inputImageUrl.match(/^data:(image\/\w+);base64,(.*)$/);
      if (!match || match.length !== 3) {
        throw new Error("Invalid base64 image data URL format for input image");
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ];
      
      // The model requires a text part, even if it's minimal.
      // Use the provided prompt, or a default if it's empty.
      parts.push({ text: prompt.trim() || 'Re-imagine this image with enhancements.' });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const generatedBase64 = part.inlineData.data;
          // Return as an array of one for consistency with the text-to-image path
          return [`data:${part.inlineData.mimeType};base64,${generatedBase64}`];
        }
      }
      
      throw new Error("The AI returned a valid response, but no image was generated from the input image.");
    } catch (error) {
       console.error("Error generating from image:", error);
       throw error;
    }
  } else {
    // ---- Original Text-to-Image Generation using imagen-4.0-generate-001 ----
    try {
      const config: {
        numberOfImages: number;
        outputMimeType: string;
        aspectRatio: string;
        negativePrompt?: string;
      } = {
        numberOfImages: numberOfImages,
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
        const base64ImageBytesArray: string[] = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
        return base64ImageBytesArray;
      } else {
        throw new Error("The AI returned a valid response, but no images were generated. This might be due to a very restrictive prompt.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
};

export const upscaleImage = async (base64ImageDataUrl: string): Promise<string> => {
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
            text: 'Upscale this image to a significantly higher resolution, creating a masterpiece of clarity and detail. Your primary goal is to meticulously enhance every aspect of the original artwork. Sharpen lines to a razor\'s edge, enrich textures so they feel tangible, and clarify details to the point where even the smallest "art marks" are perfectly visible upon close inspection. The final image should be large, crisp, and suitable for high-quality printing, without any blurriness or digital artifacts. It is crucial to preserve the original subject matter, composition, and artistic style without introducing new elements.',
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