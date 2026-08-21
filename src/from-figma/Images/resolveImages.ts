import type { Component as SchemaComponent, ImageData, Images } from '@rudironsoni/specs-schema';

export type ImageFillMap = Record<string, string>;

export interface ImageDownloadDeps {
  fetch: typeof fetch;
  writeFile?: (path: string, bytes: Uint8Array) => Promise<void>;
  mkdir?: (path: string) => Promise<void>;
}

export interface ResolveImagesOptions {
  fileKey: string;
  token: string;
  outDir?: string;
  inline?: boolean;
  deps?: ImageDownloadDeps;
}

const FIGMA_PREFIX = 'figma:';

export async function fetchImageFills(
  fileKey: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ImageFillMap> {
  const response = await fetchImpl(`https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/images`, {
    headers: { 'X-Figma-Token': token },
  });
  if (!response.ok) {
    throw new Error(`Get Image Fills failed: HTTP ${response.status}`);
  }
  const body = await response.json() as { images?: ImageFillMap; meta?: { images?: ImageFillMap } };
  return body.images ?? body.meta?.images ?? {};
}

export function imageHashesFromRegistry(images: Images | undefined): string[] {
  if (!images) return [];
  const hashes: string[] = [];
  for (const entry of Object.values(images)) {
    const hash = hashOf(entry);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

export async function resolveImages(
  images: Images | undefined,
  options: ResolveImagesOptions,
): Promise<Images | undefined> {
  if (!images || Object.keys(images).length === 0) return images;
  const deps = options.deps ?? { fetch };
  const fills = await fetchImageFills(options.fileKey, options.token, deps.fetch);
  const resolved: Images = {};
  for (const [id, entry] of Object.entries(images)) {
    resolved[id] = await resolveEntry(entry, fills, options, deps);
  }
  return resolved;
}

export async function resolveComponentImages(
  component: SchemaComponent,
  options: ResolveImagesOptions,
): Promise<SchemaComponent> {
  return {
    ...component,
    images: await resolveImages(component.images, options),
  };
}

async function resolveEntry(
  entry: ImageData,
  fills: ImageFillMap,
  options: ResolveImagesOptions,
  deps: ImageDownloadDeps,
): Promise<ImageData> {
  const hash = hashOf(entry);
  if (!hash) return entry;
  const url = fills[hash];
  if (!url) return entry;
  const downloaded = await downloadImage(url, deps.fetch);
  if (options.inline) {
    return {
      ...entry,
      src: `data:${downloaded.contentType};base64,${toBase64(downloaded.bytes)}`,
    };
  }
  const fileName = `${safeImageHash(hash)}.${downloaded.ext}`;
  if (options.outDir) {
    if (!deps.mkdir || !deps.writeFile) {
      throw new Error('outDir requires mkdir and writeFile deps');
    }
    const directory = `${options.outDir.replace(/\/$/, '')}/_images`;
    await deps.mkdir(directory);
    await deps.writeFile(`${directory}/${fileName}`, downloaded.bytes);
  }
  return { ...entry, src: `_images/${fileName}` };
}

export async function downloadImage(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; contentType: string; ext: string }> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? detectContentType(bytes);
  return { bytes, contentType, ext: extensionFor(contentType, bytes) };
}

function hashOf(entry: ImageData): string | null {
  const fromExt = entry.$extensions?.['com.figma']?.imageHash;
  if (fromExt) return fromExt;
  if (entry.src?.startsWith(FIGMA_PREFIX)) return entry.src.slice(FIGMA_PREFIX.length);
  return null;
}

function safeImageHash(hash: string): string {
  return hash.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128) || 'image';
}

function detectContentType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57) return 'image/webp';
  return 'application/octet-stream';
}

function extensionFor(contentType: string, bytes: Uint8Array): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  const detected = detectContentType(bytes);
  if (detected === 'image/png') return 'png';
  if (detected === 'image/jpeg') return 'jpg';
  if (detected === 'image/gif') return 'gif';
  if (detected === 'image/webp') return 'webp';
  return 'bin';
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
