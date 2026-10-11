import type { iSVG } from "@/types/svg";
import Fuse from "fuse.js";

export const searchSvgsWithFuse = (svgsData: iSVG[]) => {
  return new Fuse<iSVG>(svgsData, {
    keys: ["title"],
    threshold: 0.35,
    ignoreLocation: true,
    isCaseSensitive: false,
    shouldSort: true,
  });
};
