// Inspect the exact PNG used by preview and download. Each edit terminates the old worker.
export function verifyImage(imageUrl, expected, onResult) {
  let cancelled = false;
  let worker;
  let timer;
  const finish = result => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    worker?.terminate();
    onResult(result);
  };
  const image = new Image();
  image.onload = () => {
    if (cancelled) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      worker = new Worker(new URL('./decode.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = event => finish(event.data);
      worker.onerror = () => finish('unavailable');
      worker.postMessage({ pixels, width: canvas.width, height: canvas.height, expected }, [pixels.buffer]);
    } catch { finish('unavailable'); }
  };
  image.onerror = () => finish('unavailable');
  timer = setTimeout(() => finish('unavailable'), 12000);
  image.src = imageUrl;
  return () => { cancelled = true; clearTimeout(timer); worker?.terminate(); image.onload = null; image.onerror = null; };
}
