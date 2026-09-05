import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1080;
const JPEG_QUALITY = 0.6;

// Resize + recompress a picked photo before base64-encoding it. ImagePicker's
// own `quality` option only controls JPEG compression, not resolution — a
// full-res phone photo (often 3000-4000px on a side) can still blow past the
// server's request-body limit even at low JPEG quality.
export async function compressImageToBase64(
  uri: string,
  width: number,
  height: number
): Promise<string | null> {
  const longestSide = Math.max(width, height);
  const actions =
    longestSide > MAX_DIMENSION
      ? [{ resize: width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION } }]
      : [];

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  return result.base64 ?? null;
}
