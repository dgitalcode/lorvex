import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cloudinaryImageLoader,
  isCloudinaryImageUrl,
} from "@/lib/cloudinary-image-url";

describe("cloudinary image delivery", () => {
  it("detects Cloudinary image uploads only", () => {
    assert.equal(
      isCloudinaryImageUrl(
        "https://res.cloudinary.com/demo/image/upload/v1/lorvex/watch.jpg",
      ),
      true,
    );
    assert.equal(isCloudinaryImageUrl("/images/lorvex/hero.jpg"), false);
    assert.equal(
      isCloudinaryImageUrl(
        "https://res.cloudinary.com/demo/video/upload/v1/clip.mp4",
      ),
      false,
    );
  });

  it("inserts responsive transforms without fetching the original", () => {
    const out = cloudinaryImageLoader({
      src: "https://res.cloudinary.com/demo/image/upload/v171/lorvex/watch.jpg",
      width: 640,
      quality: 80,
    });
    assert.equal(
      out,
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_80,c_limit,w_640/v171/lorvex/watch.jpg",
    );
  });

  it("replaces a previous responsive transform segment", () => {
    const out = cloudinaryImageLoader({
      src: "https://res.cloudinary.com/demo/image/upload/f_auto,q_80,c_limit,w_1200/v171/lorvex/watch.jpg",
      width: 384,
    });
    assert.equal(
      out,
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_80,c_limit,w_384/v171/lorvex/watch.jpg",
    );
  });
});
