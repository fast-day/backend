import { ImageSize } from "src/minio/minio.service";
import { STORAGE_URL } from "../constant/storage-url.constant";
import { SIZES } from "../constant/image-size.constant";

export type ImageUrls = Record<ImageSize, string>;

export const buildFileUrl = (path: string | null) =>
  path ? `${STORAGE_URL}/${path}` : null;

export const buildImageUrls = (
  id: string | null,
  bucket: string,
): ImageUrls | null => {
  if (!id) return null;

  if (id.includes(".")) {
    const url = buildFileUrl(id)!;
    return { thumb: url, sm: url, md: url, lg: url };
  }

  const base = `${STORAGE_URL}/${bucket}/${id}`;
  return Object.fromEntries(
    (Object.keys(SIZES) as ImageSize[]).map((s) => [s, `${base}-${s}.webp`]),
  ) as ImageUrls;
};
