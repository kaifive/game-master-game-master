/** The moments the showdown gallery can freeze a round at (dev only). */
export const GALLERY_MOMENTS = ["intro", "ready", "show", "answer", "results", "final"] as const;
export type GalleryMoment = (typeof GALLERY_MOMENTS)[number];
