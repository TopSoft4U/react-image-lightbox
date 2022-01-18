import { ReactNode, Component } from 'react';

export interface ILightBoxProps {
  mainSrc: string;
  prevSrc?: string;
  nextSrc?: string;

  mainSrcThumbnail?: string;
  prevSrcThumbnail?: string;
  nextSrcThumbnail?: string;

  onCloseRequest(): void;
  onMovePrevRequest?(): void;
  onMoveNextRequest?(): void;
  onImageLoadError?(): void;
  onImageLoad?(): void;

  discourageDownloads?: boolean;

  animationDisabled?: boolean;
  animationOnKeyInput?: boolean;
  animationDuration?: number;

  keyRepeatLimit?: number;
  keyRepeatKeyupBonus?: number;

  imageTitle?: ReactNode;
  imageCrossOrigin?: string;

  imagePadding?: number;

  toolbarButtons?: ReactNode[];

  clickOutsideToClose?: boolean;
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
}

export default class Lightbox extends Component<ILightBoxProps, never> {}
