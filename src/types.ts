import {ImgHTMLAttributes, ReactNode} from "react";

export type LightboxXY = {
  x: number,
  y: number,
};

export type LightboxTransform = LightboxXY & {
  zoom: number;
}

export interface ILightBoxImageProps {
  full?: string;
  thumbnail?: string;
}

export type LightboxPointer = LightboxXY & {
  id: string | number,
  source?: number,
}

export type LightboxSrcType = "mainSrc" | "mainSrcThumbnail" | "nextSrc" | "nextSrcThumbnail" | "prevSrc" | "prevSrcThumbnail";

export type LightboxImageCacheItem = {
  loaded: boolean,
  width: number,
  height: number,
}

export type ReactImageLightboxProps = {
  // -----------------------------
  // Image sources
  // -----------------------------

  // Main display image url
  mainSrc: string;
  // Previous display image url (displayed to the left)
  // If left undefined, movePrev actions will not be performed, and the button not displayed
  prevSrc?: string;
  // Next display image url (displayed to the right)
  // If left undefined, moveNext actions will not be performed, and the button not displayed
  nextSrc?: string;

  // -----------------------------
  // Image thumbnail sources
  // -----------------------------

  // Thumbnail image url corresponding to props.mainSrc
  mainSrcThumbnail?: string;
  // Thumbnail image url corresponding to props.prevSrc
  prevSrcThumbnail?: string;
  // Thumbnail image url corresponding to props.nextSrc
  nextSrcThumbnail?: string;

  // -----------------------------
  // Event Handlers
  // -----------------------------

  // Close window event
  // Should change the parent state such that the lightbox is not rendered
  onCloseRequest(): void;
  // Move to previous image event
  // Should change the parent state such that props.prevSrc becomes props.mainSrc,
  //  props.mainSrc becomes props.nextSrc, etc.
  onMovePrevRequest?(): void;
  // Move to next image event
  // Should change the parent state such that props.nextSrc becomes props.mainSrc,
  //  props.mainSrc becomes props.prevSrc, etc.
  onMoveNextRequest?(): void;
  // Called when an image fails to load
  // (imageSrc: string, srcType: string, errorEvent: object): void
  onImageLoadError?(imageSrc: string, srcType: string, event: string | Event): void;
  // Called when image successfully loads
  onImageLoad?(imageSrc: string, srcType: string, element: HTMLImageElement): void;

  // -----------------------------
  // Download discouragement settings
  // -----------------------------

  // Enable download discouragement (prevents [right-click -> Save Image As...])
  discourageDownloads?: boolean;

  // -----------------------------
  // Animation settings
  // -----------------------------

  // Disable all animation
  animationDisabled?: boolean;
  // Disable animation on actions performed with keyboard shortcuts
  animationOnKeyInput?: boolean;
  // Animation duration (ms)
  animationDuration: number;

  // -----------------------------
  // Keyboard shortcut settings
  // -----------------------------

  // Required interval of time (ms) between key actions
  // (prevents excessively fast navigation of images)
  keyRepeatLimit: number;
  // Amount of time (ms) restored after each keyup
  // (makes rapid key presses slightly faster than holding down the key to navigate images)
  keyRepeatKeyupBonus: number;

  // -----------------------------
  // Image info
  // -----------------------------

  // Image title
  imageTitle?: ReactNode;
  // Optional crossOrigin attribute
  imageCrossOrigin?: ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];

  // -----------------------------
  // Lightbox style
  // -----------------------------

  // Padding (px) between the edge of the window and the lightbox
  imagePadding: number;

  // -----------------------------
  // Other
  // -----------------------------

  // Array of custom toolbar buttons
  toolbarButtons?: ReactNode[];
  // When true, clicks outside of the image close the lightbox
  clickOutsideToClose?: boolean;
  // Set to false to disable zoom functionality and hide zoom buttons
  enableZoom?: boolean;

  // Aria-labels
  nextLabel?: string;
  prevLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  closeLabel?: string;

  imageLoadErrorMessage?: ReactNode;

  // custom loader
  loader?: ReactNode;

  // New props - custom
  footer?: ReactNode;
  showToolbar?: boolean;

  // Class names
  outerClassName?: string;
  toolbarClassName?: string;
  innerClassName?: string;
  footerClassName?: string;

  images: ILightBoxImageProps[];
  activeImage: number;
}

export type LightboxLoadErrorStatus = {
  [key in LightboxSrcType]?: boolean;
};

export type ReactImageLightboxState = {
  isClosing?: boolean;
  shouldAnimate?: boolean;
  zoomLevel: number;

  offsetX: number;
  offsetY: number;

  loadErrorStatus: LightboxLoadErrorStatus;
}
