import Image, { type ImageProps } from "next/image";
import {
  cloudinaryImageLoader,
  isCloudinaryImageUrl,
} from "@/lib/cloudinary-image-url";

/** Uses Cloudinary CDN transforms for product/CMS photos; Next optimizer for local assets. */
export function StorefrontImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  if (src && isCloudinaryImageUrl(src)) {
    return <Image {...props} loader={cloudinaryImageLoader} />;
  }
  return <Image {...props} />;
}
