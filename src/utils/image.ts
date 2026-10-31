import * as ImageManipulator from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

const MAX_SIDE = 1600; // cạnh dài tối đa (px)

/** Chuyển ảnh (HEIC/PNG/...) sang JPEG, thu nhỏ và nén để dưới 5MB. */
export async function toJpegAsset(
  asset: ImagePickerAsset,
): Promise<ImagePickerAsset> {
  const w = asset.width || 0;
  const h = asset.height || 0;
  const actions: ImageManipulator.Action[] = [];
  if (Math.max(w, h) > MAX_SIDE) {
    actions.push({ resize: w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE } });
  }

  const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    ...asset,
    uri: out.uri,
    width: out.width,
    height: out.height,
    fileName: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`,
    mimeType: "image/jpeg",
  };
}

export const toJpegAssets = (assets: ImagePickerAsset[]) =>
  Promise.all(assets.map(toJpegAsset));