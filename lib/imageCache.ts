const MAX_IMAGE_DIMENSION = 640;
const JPEG_QUALITY = 0.82;

export async function cacheRemoteImageAsDataUrl(url: string) {
  if (!url || typeof window === 'undefined' || typeof document === 'undefined') {
    return undefined;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      return undefined;
    }

    const blob = await response.blob();
    const imageElement = await loadImageFromBlob(blob);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(imageElement.naturalWidth, imageElement.naturalHeight, 1)
    );
    const width = Math.max(1, Math.round(imageElement.naturalWidth * scale));
    const height = Math.max(1, Math.round(imageElement.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return undefined;
    }

    context.drawImage(imageElement, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return undefined;
  }
}

function loadImageFromBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageElement = new window.Image();
    imageElement.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imageElement);
    };
    imageElement.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Bild konnte nicht geladen werden.'));
    };
    imageElement.src = objectUrl;
  });
}
