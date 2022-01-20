import {ImgHTMLAttributes, ReactNode} from "react";
import {RILNavButtonProps} from "./Components/RILNavButton";

import {RILToolbarButtonProps} from "./Components/RILToolbarButton";

export type ReactImageLightboxProps = {
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
  onImageLoadError?(imageSrc: string, type: LightboxSrcType, index: number, event: string | Event): void;
  // Called when image successfully loads
  onImageLoad?(imageSrc: string, type: LightboxSrcType, index: number, element: HTMLImageElement): void;

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

  images: RILImageProps[];
  activeIndex: number;
  loadAhead: number;
  infiniteScrolling: boolean;

  // Renderers
  prevButtonRenderer?: (props: RILNavButtonProps) => JSX.Element;
  nextButtonRenderer?: (props: RILNavButtonProps) => JSX.Element;

  zoomInButtonRenderer?: (props: RILToolbarButtonProps) => JSX.Element;
  zoomOutButtonRenderer?: (props: RILToolbarButtonProps) => JSX.Element;
  closeButtonRenderer?: (props: RILToolbarButtonProps) => JSX.Element;
}

export type ReactImageLightboxState = {
  isClosing?: boolean;
  shouldAnimateSnap?: boolean;
  zoomLevel: number;

  offsetX: number;
  offsetY: number;

  loadableIndexes: number[];
  loadErrorStatus: LightboxLoadErrorStatus;
}

export type LightboxXY = {
  x: number,
  y: number,
};

export type LightboxTransform = LightboxXY & {
  zoom: number;
}

export type RILImageProps = {
  full: string;
  thumbnail?: string;
  title?: ReactNode;
  crossOrigin?: ImgHTMLAttributes<HTMLImageElement>["crossOrigin"];
}

export type RILScrollerImage = RILImageProps & {
  hasError: boolean;
  shouldLoad: boolean;
  errorMessage?: ReactNode;
}

export type LightboxPointer = LightboxXY & {
  id: string | number,
  source?: number,
}

export type LightboxSrcTypeKey = keyof Pick<RILImageProps, "full" | "thumbnail">;
export type LightboxSrcType = `${LightboxSrcTypeKey}-${number}`;

export type LightboxImageCacheItem = {
  loaded: boolean,
  width: number,
  height: number,
}

export type ReactImageLightboxGenerateLoadError = (err?: any) => void;
export type ReactImageLightboxGenerateLoadDoneCallback = (type: LightboxSrcType, index: number, imageSrc: string) => ReactImageLightboxGenerateLoadError;

export type LightboxLoadErrorStatus = {
  [key in LightboxSrcType]?: boolean;
};

export type RILBestImageForType = {
  targetHeight: number;
  src: string;
  width: number;
  height: number;
  targetWidth: number;
};
