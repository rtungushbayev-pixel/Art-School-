import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

// Фото с телефона часто 4000+ пикселей и несколько мегабайт. Перед загрузкой
// уменьшаем длинную сторону и сохраняем в JPEG: на экране телефона разницы
// не видно, а места в хранилище и трафика уходит в разы меньше.
export const MAX_PHOTO_SIDE = 1600;
export const MAX_AVATAR_SIDE = 600;

export async function shrinkAsset(asset: ImagePickerAsset, maxSide = MAX_PHOTO_SIDE): Promise<ImagePickerAsset> {
  try {
    const { width, height } = asset;
    const context = ImageManipulator.manipulate(asset.uri);
    if (width && height && Math.max(width, height) > maxSide) {
      context.resize(width >= height ? { width: maxSide } : { height: maxSide });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return {
      ...asset,
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType: 'image/jpeg',
      fileName: asset.fileName ? asset.fileName.replace(/\.[^.]+$/, '.jpg') : asset.fileName,
    };
  } catch {
    // Не получилось обработать (редкий формат) — загружаем как есть.
    return asset;
  }
}
