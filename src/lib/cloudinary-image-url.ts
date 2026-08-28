/**
 * Cloudinary delivery for next/image: request a width-limited, auto-format
 * derivative instead of the original upload through the Next optimizer.
 */
export function isCloudinaryImageUrl(src: string) {
  return (
    src.startsWith("https://res.cloudinary.com/") &&
    src.includes("/image/upload/")
  );
}

export function cloudinaryImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  const q = quality ?? 80;
  const marker = "/image/upload/";
  const index = src.indexOf(marker);
  if (index === -1) return src;
  const prefix = src.slice(0, index + marker.length);
  let rest = src.slice(index + marker.length);
  rest = rest.replace(/^(?:(?:f_auto|q_(?:auto|\d+)|c_limit|w_\d+),?)+\//, "");
  return `${prefix}f_auto,q_${q},c_limit,w_${width}/${rest}`;
}
