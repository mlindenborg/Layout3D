import puter from "@heyputer/puter.js";
import { LAYOUT3D_RENDER_PROMPT } from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch(url);
  try {
    const response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Failed to fetch image: request timed out after 30s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image: ${response.status} ${response.statusText}`,
    );
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};
export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
  const dataUrl = sourceImage.startsWith("data:")
    ? sourceImage
    : await fetchAsDataUrl(sourceImage);

  if (!dataUrl.includes(",") || !dataUrl.includes(";")) {
    throw new Error("Invalid data URL format");
  }

  const base64Data = dataUrl.split(",")[1];
  //get type of the image
  const mimeType = dataUrl.split(";")[0].split(":")[1];

  //if we dont have any of the above
  if (!mimeType || !base64Data) throw new Error("Invalid source image payload");

  //but if we do have them we can call the puter function in puter
  // but if we do have them we can call the puter function in puter
  let response;
  try {
    response = await puter.ai.txt2img(LAYOUT3D_RENDER_PROMPT, {
      provider: "gemini",
      model: "gemini-2.5-flash-image-preview",
      input_image: base64Data,
      input_image_mime_type: mimeType,
      ratio: { w: 1024, h: 1024 },
    });
  } catch (error) {
    throw new Error(
      `AI rendering failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
  //Generate the raw image url as a htmlimageelement
  const rawImageUrl = (response as HTMLImageElement).src ?? null;
  //if we dont have a rawimageurl, we set the renderedimage to null and the path tp undefined
  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };
  //but if we have the rawimageurl we can create the renderedimage and call the function fetchasdataurl with the rawurl
  const renderedImage = rawImageUrl.startsWith("data:")
    ? rawImageUrl
    : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined };
};
