
import { GoogleGenAI, Modality } from "@google/genai";

export const generateImage = async (prompt: string, aspectRatio: string, numberOfImages: number, model: string, negativePrompt?: string, inputImageUrl?: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // This block handles both Image-to-Image and Text-to-Image with the gemini-2.5-flash-image model
  if (model === 'gemini-2.5-flash-image' || inputImageUrl) {
      const effectiveModel = 'gemini-2.5-flash-image';
      
      try {
          const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
          
          if (inputImageUrl) {
              const match = inputImageUrl.match(/^data:(image\/\w+);base64,(.*)$/);
              if (!match || match.length !== 3) {
                  throw new Error("Invalid base64 image data URL format for input image");
              }
              const mimeType = match[1];
              const base64Data = match[2];
              parts.push({
                  inlineData: { data: base64Data, mimeType: mimeType },
              });
          }
          
          // A text part is always required for this model's API call.
          parts.push({ text: prompt.trim() || 'Generate an image based on the input.' });

          const response = await ai.models.generateContent({
              model: effectiveModel,
              contents: { parts },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
          });

          if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const generatedBase64 = part.inlineData.data;
                    return [`data:${part.inlineData.mimeType};base64,${generatedBase64}`];
                }
            }
          }
          
          throw new Error("The AI returned a valid response, but no image was generated.");
      } catch (error) {
         console.error(`Error generating with ${effectiveModel}:`, error);
         throw error;
      }
  } 
  // This block handles Text-to-Image with the high-quality imagen-4.0-generate-001 model
  else if (model === 'imagen-4.0-generate-001') {
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
              return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
          } else {
              throw new Error("The AI returned a valid response, but no images were generated. This might be due to a very restrictive prompt.");
          }
      } catch (error) {
          console.error("Error generating image with imagen-4.0:", error);
          throw error;
      }
  } else {
      throw new Error(`Unsupported model selected for image generation: ${model}`);
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
