import {
  Component,
  createRef,
  EventHandler,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  PointerEvent,
  PointerEventHandler,
  RefObject,
  SyntheticEvent,
  Touch,
  TouchEventHandler,
  WheelEventHandler
} from "react";
import classNames from "classnames";
import {getHighestSafeWindowContext, getWindowHeight, getWindowWidth, loadableIndexes, stopEvent,arraySame} from "./util";

import {
  ACTION_MOVE,
  ACTION_NONE,
  ACTION_PINCH,
  ACTION_SWIPE,
  IMAGE_KEYS,
  KEYS,
  MAX_ZOOM_LEVEL,
  MIN_SWIPE_DISTANCE,
  MIN_ZOOM_LEVEL,
  SOURCE_ANY,
  SOURCE_MOUSE,
  SOURCE_POINTER,
  SOURCE_TOUCH,
  WHEEL_MOVE_X_THRESHOLD,
  WHEEL_MOVE_Y_THRESHOLD,
  ZOOM_BUTTON_INCREMENT_SIZE,
  ZOOM_RATIO
} from "./constant";
import "./style.css";
import ToolbarButton from "./Components/ToolbarButton";
import {
  LightboxImageCacheItem,
  LightboxLoadErrorStatus,
  LightboxPointer,
  LightboxSrcType,
  LightboxXY,
  ReactImageLightboxGenerateLoadDoneCallback,
  ReactImageLightboxGenerateLoadError,
  ReactImageLightboxProps,
  ReactImageLightboxState,
  RILBestImageForType,
  RILScrollerImage
} from "./types";
import Scroller from "./Components/Scroller";

class ReactImageLightbox extends Component<ReactImageLightboxProps, ReactImageLightboxState> {
  static defaultProps = {
    animationDisabled: false,
    animationDuration: 300,
    clickOutsideToClose: true,
    closeLabel: "Close lightbox",
    discourageDownloads: false,
    enableZoom: true,
    imagePadding: 10,
    keyRepeatKeyupBonus: 40,
    keyRepeatLimit: 180,
    nextLabel: "Next image",
    prevLabel: "Previous image",
    zoomInLabel: "Zoom in",
    zoomOutLabel: "Zoom out",
    imageLoadErrorMessage: "This image failed to load",

    // Custom
    showToolbar: true,
    loadAhead: 1,
    infiniteScrolling: true,
  };

  state: Readonly<ReactImageLightboxState> = {
    // -----------------------------
    // Animation
    // -----------------------------

    // Component parts should animate (e.g., when images are moving, or image is being zoomed)
    shouldAnimateSnap: false,

    // -----------------------------
    // Zoom settings
    // -----------------------------
    // Zoom level of image
    zoomLevel: MIN_ZOOM_LEVEL,

    // -----------------------------
    // Image position settings
    // -----------------------------
    // Horizontal offset from center
    offsetX: 0,

    // Vertical offset from center
    offsetY: 0,

    // image load error for srcType
    loadErrorStatus: {},

    loadableIndexes: [],
  }

  private outerEl: RefObject<HTMLDivElement> = createRef();
  private currentEl: RefObject<HTMLDivElement> = createRef();
  private zoomInBtn: RefObject<HTMLButtonElement> = createRef();
  private zoomOutBtn: RefObject<HTMLButtonElement> = createRef();

  // Timeouts - always clear it before umount
  private timeouts: NodeJS.Timeout[] = [];
  // Current action
  private currentAction = ACTION_NONE;
  // Events source
  private eventsSource = SOURCE_ANY;
  // Empty pointers list
  private pointerList: LightboxPointer[] = [];
  // Used to disable animation when changing props.mainSrc|nextSrc|prevSrc
  private keyPressed = false;
  // Used to store load state / dimensions of images
  private imageCache: { [key: string]: LightboxImageCacheItem } = {};
  // Time the last keydown event was called (used in keyboard action rate limiting)
  private lastKeyDownTime = 0;

  // Used for debouncing window resize event
  private resizeTimeout: NodeJS.Timeout | null = null;
  // Used to determine when actions are triggered by the scroll wheel
  private wheelActionTimeout: NodeJS.Timeout | null = null;
  private resetScrollTimeout: NodeJS.Timeout | null = null;
  private scrollX = 0;

  // Used in panning zoomed images
  private moveStartX = 0;
  private moveStartY = 0;
  private moveStartOffsetX = 0;
  private moveStartOffsetY = 0;

  // Used to swipe
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeEndX = 0;
  private swipeEndY = 0;

  // Used to pinch
  private pinchTouchList: LightboxPointer[] = [];
  private pinchDistance = 0;

  // Used to differentiate between images with identical src
  private keyCounter = 0;

  // Used to detect a move when all src's remain unchanged (four or more of the same image in a row)
  private moveRequested = false;

  private windowContext?: Window;

  private listeners: { [key: string]: EventHandler<any> } = {};

  private didUnmount = false;

  static isTargetMatchImage = (target: EventTarget) => {
    if (!target)
      return false;

    const className = (target as HTMLElement).className;
    return (
      target &&
      (
        /ril-inner/.test(className) ||
        /ril-image-wrapper/.test(className) ||
        /ril-download-blocker/.test(className) ||
        /ril-image/.test(className)
      )
    );
  };

  static parseMouseEvent = (mouseEvent: MouseEvent<HTMLDivElement>): LightboxPointer => ({
    id: "mouse",
    source: SOURCE_MOUSE,
    x: parseInt(String(mouseEvent.clientX), 10),
    y: parseInt(String(mouseEvent.clientY), 10),
  });

  static parseTouchPointer = (touchPointer: Touch): LightboxPointer => ({
    id: touchPointer.identifier,
    source: SOURCE_TOUCH,
    x: parseInt(String(touchPointer.clientX), 10),
    y: parseInt(String(touchPointer.clientY), 10),
  });

  static parsePointerEvent = (pointerEvent: PointerEvent<HTMLDivElement>): LightboxPointer => ({
    id: pointerEvent.pointerId,
    source: SOURCE_POINTER,
    x: parseInt(String(pointerEvent.clientX), 10),
    y: parseInt(String(pointerEvent.clientY), 10),
  });

  componentDidMount() {
    if (!this.props.animationDisabled) {
      // Make opening animation play
      this.setState({isClosing: false});
    }

    // Prevents cross-origin errors when using a cross-origin iframe
    this.windowContext = getHighestSafeWindowContext();

    this.listeners = {
      resize: this.handleWindowResize,
      mouseup: this.handleMouseUp,
      touchend: this.handleTouchEnd,
      touchcancel: this.handleTouchEnd,
      pointerdown: this.handlePointerEvent,
      pointermove: this.handlePointerEvent,
      pointerup: this.handlePointerEvent,
      pointercancel: this.handlePointerEvent,
    };
    Object.keys(this.listeners).forEach(type => {
      this.windowContext?.addEventListener(type, this.listeners[type]);
    });

    this.loadAllImages();
  }

  shouldComponentUpdate(nextProps: ReactImageLightboxProps) {
    this.moveRequested = this.props.activeIndex !== nextProps.activeIndex;
    return true;
  }

  componentDidUpdate(prevProps: ReactImageLightboxProps) {
    let sourcesChanged = prevProps.images.length !== this.props.images.length;
    if (!sourcesChanged) {
      const prevSrcs = prevProps.images.map(x => x.full);
      const nextSrcs = this.props.images.map(x => x.full);

      sourcesChanged = !arraySame(prevSrcs, nextSrcs);
    }

    if (sourcesChanged || this.moveRequested) {
      this.moveRequested = false;

      // Load any new images
      this.loadAllImages();
    }
  }

  componentWillUnmount() {
    this.didUnmount = true;
    Object.keys(this.listeners).forEach(type => {
      this.windowContext?.removeEventListener(type, this.listeners[type]);
    });
    this.timeouts.forEach(tid => clearTimeout(tid));
  }

  setTimeout = (func: () => void, time: number) => {
    const id = setTimeout(() => {
      this.timeouts = this.timeouts.filter(tid => tid !== id);
      func();
    }, time);
    this.timeouts.push(id);
    return id;
  };

  updateLoadableIndexes = () => {
    const {images, activeIndex, loadAhead, infiniteScrolling} = this.props;
    const {loadableIndexes: oldIndexes} = this.state;
    const newIndexes = loadableIndexes(images.length, activeIndex, loadAhead, infiniteScrolling);

    if (!arraySame(oldIndexes, newIndexes)) {
      this.setState(prev => ({
        ...prev,
        loadableIndexes: newIndexes
      }));
    }

    return newIndexes;
  }

  // Get info for the best suited image to display with the given srcType
  getBestImageForType = (index: number): RILBestImageForType | undefined => {
    let imageSrc: string | undefined = this.props.images[index].full;
    if (!imageSrc)
      return;

    let fitSizes = {
      width: 0, height: 0,
    };

    if (this.isImageLoaded(imageSrc)) {
      // Use full-size image if available
      fitSizes = this.getFitSizes(
        this.imageCache[imageSrc].width,
        this.imageCache[imageSrc].height
      );
    } else {
      imageSrc = this.props.images[index].thumbnail;
      if (imageSrc && this.isImageLoaded(imageSrc)) {
        // Fall back to using thumbnail if the image has not been loaded
        fitSizes = this.getFitSizes(
          this.imageCache[imageSrc].width,
          this.imageCache[imageSrc].height,
          true
        );
      } else
        return;
    }

    return {
      src: imageSrc,
      height: this.imageCache[imageSrc].height,
      width: this.imageCache[imageSrc].width,
      targetHeight: fitSizes.height,
      targetWidth: fitSizes.width,
    };
  };

  // Get sizing for when an image is larger than the window
  getFitSizes = (width: number, height: number, stretch = false) => {
    const boxSize = this.getLightboxRect();
    let maxHeight = boxSize.height - this.props.imagePadding * 2;
    let maxWidth = boxSize.width - this.props.imagePadding * 2;

    if (!stretch) {
      maxHeight = Math.min(maxHeight, height);
      maxWidth = Math.min(maxWidth, width);
    }

    const maxRatio = maxWidth / maxHeight;
    const srcRatio = width / height;

    if (maxRatio > srcRatio) {
      // height is the constraining dimension of the photo
      return {
        width: (width * maxHeight) / height,
        height: maxHeight,
      };
    }

    return {
      width: maxWidth,
      height: (height * maxWidth) / width,
    };
  };

  getMaxOffsets = () => {
    const boxSize = this.getLightboxRect();

    const imgElement = this.currentEl.current?.getBoundingClientRect();
    if (!imgElement)
      return {maxX: 0, maxY: 0, minX: 0, minY: 0};

    const {width, height} = imgElement;

    // TODO This formula needs to be rewritten, because there are issues with big zooms.

    let maxX;
    if (width - boxSize.width < 0) {
      // if there is still blank space in the X dimension, don't limit except to the opposite edge
      maxX = (boxSize.width - width) / 2;
    } else {
      maxX = (width - boxSize.width) / 2;
    }

    let maxY;
    if (height - boxSize.height < 0) {
      // if there is still blank space in the Y dimension, don't limit except to the opposite edge
      maxY = (boxSize.height - height) / 2;
    } else {
      maxY = (height - boxSize.height) / 2;
    }

    return {
      maxX,
      maxY,
      minX: -1 * maxX,
      minY: -1 * maxY,
    };
  };

  getPrevSrc = () => {
    const {images, infiniteScrolling, activeIndex} = this.props;

    if (!images.length)
      return;

    let index = activeIndex - 1;
    if (!infiniteScrolling && index < 0)
      return;
    if (infiniteScrolling)
      index = images.length - 1;

    return images[index].full;
  }

  getNextSrc = () => {
    const {images, infiniteScrolling, activeIndex} = this.props;

    if (!images.length)
      return;

    let index = activeIndex + 1;
    if (!infiniteScrolling && index >= images.length)
      return;
    if (infiniteScrolling)
      index = 0;

    return images[index].full;

  }

  /**
   * Get sizing when the image is scaled
   */
  getZoomMultiplier = (zoomLevel = this.state.zoomLevel) => ZOOM_RATIO ** zoomLevel;

  /**
   * Get the size of the lightbox in pixels
   */
  getLightboxRect = () => {
    if (this.outerEl.current) {
      return this.outerEl.current.getBoundingClientRect();
    }

    return {
      width: getWindowWidth(),
      height: getWindowHeight(),
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  };

  clearTimeout = (id: NodeJS.Timeout | null) => {
    if (!id)
      return;

    this.timeouts = this.timeouts.filter(tid => tid !== id);
    clearTimeout(id);
  };

  // Change zoom level
  changeZoom = (zoomLevel: number, clientX?: number, clientY?: number) => {
    // Ignore if zoom disabled
    if (!this.props.enableZoom) {
      return;
    }

    // Constrain zoom level to the set bounds
    const nextZoomLevel = Math.max(
      MIN_ZOOM_LEVEL,
      Math.min(MAX_ZOOM_LEVEL, zoomLevel)
    );

    // Ignore requests that don't change the zoom level
    if (nextZoomLevel === this.state.zoomLevel) {
      return;
    }

    if (nextZoomLevel === MIN_ZOOM_LEVEL) {
      // Snap back to center if zoomed all the way out
      this.setState({
        zoomLevel: nextZoomLevel,
        offsetX: 0,
        offsetY: 0,
      });

      return;
    }

    const imageBaseSize = this.getBestImageForType(this.props.activeIndex);
    if (!imageBaseSize) {
      return;
    }

    const currentZoomMultiplier = this.getZoomMultiplier();
    const nextZoomMultiplier = this.getZoomMultiplier(nextZoomLevel);

    // Default to the center of the image to zoom when no mouse position specified
    const boxRect = this.getLightboxRect();
    const pointerX =
      typeof clientX !== "undefined"
        ? clientX - boxRect.left
        : boxRect.width / 2;
    const pointerY =
      typeof clientY !== "undefined"
        ? clientY - boxRect.top
        : boxRect.height / 2;

    const currentImageOffsetX =
      (boxRect.width - imageBaseSize.width * currentZoomMultiplier) / 2;
    const currentImageOffsetY =
      (boxRect.height - imageBaseSize.height * currentZoomMultiplier) / 2;

    const currentImageRealOffsetX = currentImageOffsetX - this.state.offsetX;
    const currentImageRealOffsetY = currentImageOffsetY - this.state.offsetY;

    const currentPointerXRelativeToImage =
      (pointerX - currentImageRealOffsetX) / currentZoomMultiplier;
    const currentPointerYRelativeToImage =
      (pointerY - currentImageRealOffsetY) / currentZoomMultiplier;

    const nextImageRealOffsetX =
      pointerX - currentPointerXRelativeToImage * nextZoomMultiplier;
    const nextImageRealOffsetY =
      pointerY - currentPointerYRelativeToImage * nextZoomMultiplier;

    const nextImageOffsetX =
      (boxRect.width - imageBaseSize.width * nextZoomMultiplier) / 2;
    const nextImageOffsetY =
      (boxRect.height - imageBaseSize.height * nextZoomMultiplier) / 2;

    let nextOffsetX = nextImageOffsetX - nextImageRealOffsetX;
    let nextOffsetY = nextImageOffsetY - nextImageRealOffsetY;

    // When zooming out, limit the offset so things don't get left askew
    if (this.currentAction !== ACTION_PINCH) {
      const maxOffsets = this.getMaxOffsets();
      if (this.state.zoomLevel > nextZoomLevel) {
        nextOffsetX = Math.max(
          maxOffsets.minX,
          Math.min(maxOffsets.maxX, nextOffsetX)
        );
        nextOffsetY = Math.max(
          maxOffsets.minY,
          Math.min(maxOffsets.maxY, nextOffsetY)
        );
      }
    }

    this.setState({
      zoomLevel: nextZoomLevel,
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
    });
  };

  /**
   * Handle user keyboard actions
   */
  handleKeyInput: KeyboardEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();

    // Allow slightly faster navigation through the images when user presses keys repeatedly
    if (event.type === "keyup") {
      this.lastKeyDownTime -= this.props.keyRepeatKeyupBonus!;
      return;
    }

    const keyCode = event.key;

    // Ignore key presses that happen too close to each other (when rapid fire key pressing or holding down the key)
    // But allow it if it's a lightbox closing action
    const currentTime = new Date();
    if (
      currentTime.getTime() - this.lastKeyDownTime <
      this.props.keyRepeatLimit &&
      keyCode !== KEYS.ESC
    ) {
      return;
    }
    this.lastKeyDownTime = currentTime.getTime();

    switch (keyCode) {
      // ESC key closes the lightbox
      case KEYS.ESC:
        stopEvent(event);
        this.requestClose();
        break;

      // Left arrow key moves to previous image
      case KEYS.LEFT_ARROW:
        if (!this.getPrevSrc()) {
          return;
        }

        stopEvent(event);
        this.keyPressed = true;
        this.requestMovePrev();
        break;

      // Right arrow key moves to next image
      case KEYS.RIGHT_ARROW:
        if (!this.getNextSrc()) {
          return;
        }

        stopEvent(event);
        this.keyPressed = true;
        this.requestMoveNext();
        break;

      default:
    }
  }

  /**
   * Handle a mouse wheel event over the lightbox container
   */
  handleOuterMousewheel: WheelEventHandler = (event) => {
    // Prevent scrolling of the background
    event.stopPropagation();

    const xThreshold = WHEEL_MOVE_X_THRESHOLD;
    let actionDelay = 0;
    const imageMoveDelay = 500;

    this.clearTimeout(this.resetScrollTimeout);
    this.resetScrollTimeout = this.setTimeout(() => {
      this.scrollX = 0;
    }, 300);

    // Prevent rapid-fire zoom behavior
    if (this.wheelActionTimeout !== null || this.isAnimatingSnap()) {
      return;
    }

    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
      // handle horizontal scrolls with image moves
      this.scrollX += event.deltaX;

      const bigLeapX = xThreshold / 2;
      // If the scroll amount has accumulated sufficiently, or a large leap was taken
      if (this.scrollX >= xThreshold || event.deltaX >= bigLeapX) {
        // Scroll right moves to next
        this.requestMoveNext();
        actionDelay = imageMoveDelay;
        this.scrollX = 0;
      } else if (
        this.scrollX <= -1 * xThreshold ||
        event.deltaX <= -1 * bigLeapX
      ) {
        // Scroll left moves to previous
        this.requestMovePrev();
        actionDelay = imageMoveDelay;
        this.scrollX = 0;
      }
    }

    // Allow successive actions after the set delay
    if (actionDelay !== 0) {
      this.wheelActionTimeout = this.setTimeout(() => {
        this.wheelActionTimeout = null;
      }, actionDelay);
    }
  }

  handleImageMouseWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
      event.stopPropagation();
      // If the vertical scroll amount was large enough, perform a zoom
      if (Math.abs(event.deltaY) < WHEEL_MOVE_Y_THRESHOLD) {
        return;
      }

      this.scrollX = 0;

      this.changeZoom(
        this.state.zoomLevel - event.deltaY,
        event.clientX,
        event.clientY
      );
    }
  }

  /**
   * Handle a double click on the current image
   */
  handleImageDoubleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (this.state.zoomLevel > MIN_ZOOM_LEVEL) {
      // A double click when zoomed in zooms all the way out
      this.changeZoom(MIN_ZOOM_LEVEL, event.clientX, event.clientY);
    } else {
      // A double click when zoomed all the way out zooms in
      this.changeZoom(
        this.state.zoomLevel + ZOOM_BUTTON_INCREMENT_SIZE,
        event.clientX,
        event.clientY
      );
    }
  }

  shouldHandleEvent = (source: number) => {
    if (this.eventsSource === source) {
      return true;
    }
    if (this.eventsSource === SOURCE_ANY) {
      this.eventsSource = source;
      return true;
    }
    switch (source) {
      case SOURCE_MOUSE:
        return false;
      case SOURCE_TOUCH:
        this.eventsSource = SOURCE_TOUCH;
        this.filterPointersBySource();
        return true;
      case SOURCE_POINTER:
        if (this.eventsSource === SOURCE_MOUSE) {
          this.eventsSource = SOURCE_POINTER;
          this.filterPointersBySource();
          return true;
        }
        return false;
      default:
        return false;
    }
  };

  addPointer = (pointer: LightboxPointer) => {
    this.pointerList.push(pointer);
  };

  removePointer = (pointer: LightboxPointer) => {
    this.pointerList = this.pointerList.filter(({id}) => id !== pointer.id);
  };

  filterPointersBySource = () => {
    this.pointerList = this.pointerList.filter(
      ({source}) => source === this.eventsSource
    );
  };

  handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
    if (
      this.shouldHandleEvent(SOURCE_MOUSE) &&
      ReactImageLightbox.isTargetMatchImage(event.target)
    ) {
      this.addPointer(ReactImageLightbox.parseMouseEvent(event));
      this.multiPointerStart();
    }
  }

  handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    if (this.shouldHandleEvent(SOURCE_MOUSE)) {
      this.multiPointerMove(event, [ReactImageLightbox.parseMouseEvent(event)]);
    }
  }

  handleMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
    if (this.shouldHandleEvent(SOURCE_MOUSE)) {
      this.removePointer(ReactImageLightbox.parseMouseEvent(event));
      this.multiPointerEnd(event);
    }
  }

  handlePointerEvent: PointerEventHandler<HTMLDivElement> = (event) => {
    if (this.shouldHandleEvent(SOURCE_POINTER)) {
      switch (event.type) {
        case "pointerdown":
          if (ReactImageLightbox.isTargetMatchImage(event.target)) {
            this.addPointer(ReactImageLightbox.parsePointerEvent(event));
            this.multiPointerStart();
          }
          break;
        case "pointermove":
          this.multiPointerMove(event, [
            ReactImageLightbox.parsePointerEvent(event),
          ]);
          break;
        case "pointerup":
        case "pointercancel":
          this.removePointer(ReactImageLightbox.parsePointerEvent(event));
          this.multiPointerEnd(event);
          break;
        default:
          break;
      }
    }
  }

  handleTouchStart: TouchEventHandler<HTMLDivElement> = (event) => {
    if (
      this.shouldHandleEvent(SOURCE_TOUCH) &&
      ReactImageLightbox.isTargetMatchImage(event.target)
    ) {
      [].forEach.call(event.changedTouches, (eventTouch: Touch) =>
        this.addPointer(ReactImageLightbox.parseTouchPointer(eventTouch))
      );
      this.multiPointerStart();
    }
  }

  handleTouchMove: TouchEventHandler<HTMLDivElement> = (event) => {
    if (this.shouldHandleEvent(SOURCE_TOUCH)) {
      this.multiPointerMove(
        event,
        Array.from(event.changedTouches).map((eventTouch: Touch) =>
          ReactImageLightbox.parseTouchPointer(eventTouch)
        )
      );
    }
  }

  handleTouchEnd: TouchEventHandler<HTMLDivElement> = (event) => {
    if (this.shouldHandleEvent(SOURCE_TOUCH)) {
      [].map.call(event.changedTouches, touch =>
        this.removePointer(ReactImageLightbox.parseTouchPointer(touch))
      );
      this.multiPointerEnd(event);
    }
  }

  decideMoveOrSwipe = (pointer: LightboxPointer) => {
    if (this.state.zoomLevel <= MIN_ZOOM_LEVEL) {
      this.handleSwipeStart(pointer);
    } else {
      this.handleMoveStart(pointer);
    }
  };

  multiPointerStart = () => {
    this.handleEnd();
    switch (this.pointerList.length) {
      case 1: {
        // stopEvent(event);
        this.decideMoveOrSwipe(this.pointerList[0]);
        break;
      }
      case 2: {
        // stopEvent(event);
        this.handlePinchStart(this.pointerList);
        break;
      }
      default:
        break;
    }
  };

  multiPointerMove = (event: SyntheticEvent, pointerList: LightboxPointer[]) => {
    switch (this.currentAction) {
      case ACTION_MOVE: {
        // stopEvent(event);
        this.handleMove(pointerList[0]);
        break;
      }
      case ACTION_SWIPE: {
        // stopEvent(event);
        this.handleSwipe(pointerList[0]);
        break;
      }
      case ACTION_PINCH: {
        // stopEvent(event);
        this.handlePinch(pointerList);
        break;
      }
      default:
        break;
    }
  };

  multiPointerEnd = (event: SyntheticEvent) => {
    if (this.currentAction !== ACTION_NONE) {
      this.handleEnd(event);
    }
    switch (this.pointerList.length) {
      case 0: {
        this.eventsSource = SOURCE_ANY;
        break;
      }
      case 1: {
        stopEvent(event);
        this.decideMoveOrSwipe(this.pointerList[0]);
        break;
      }
      case 2: {
        stopEvent(event);
        this.handlePinchStart(this.pointerList);
        break;
      }
      default:
        break;
    }
  };

  handleEnd = (event?: SyntheticEvent) => {
    switch (this.currentAction) {
      case ACTION_MOVE:
        this.handleMoveEnd();
        break;
      case ACTION_SWIPE:
        this.handleSwipeEnd(event);
        break;
      case ACTION_PINCH:
        this.handlePinchEnd();
        break;
      default:
        break;
    }
  };

  // Handle move start over the lightbox container
  // This happens:
  // - On a mouseDown event
  // - On a touchstart event
  handleMoveStart = ({x: clientX, y: clientY}: LightboxXY) => {
    if (!this.props.enableZoom) {
      return;
    }
    this.currentAction = ACTION_MOVE;
    this.moveStartX = clientX;
    this.moveStartY = clientY;
    this.moveStartOffsetX = this.state.offsetX;
    this.moveStartOffsetY = this.state.offsetY;
  };

  // Handle dragging over the lightbox container
  // This happens:
  // - After a mouseDown and before a mouseUp event
  // - After a touchstart and before a touchend event
  handleMove = ({x: clientX, y: clientY}: LightboxXY) => {
    const newOffsetX = this.moveStartX - clientX + this.moveStartOffsetX;
    const newOffsetY = this.moveStartY - clientY + this.moveStartOffsetY;
    if (
      this.state.offsetX !== newOffsetX ||
      this.state.offsetY !== newOffsetY
    ) {
      this.setState({
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    }
  };

  handleMoveEnd = () => {
    this.currentAction = ACTION_NONE;
    this.moveStartX = 0;
    this.moveStartY = 0;
    this.moveStartOffsetX = 0;
    this.moveStartOffsetY = 0;

    // Snap image back into frame if outside max offset range
    const maxOffsets = this.getMaxOffsets();
    const nextOffsetX = Math.max(
      maxOffsets.minX,
      Math.min(maxOffsets.maxX, this.state.offsetX)
    );
    const nextOffsetY = Math.max(
      maxOffsets.minY,
      Math.min(maxOffsets.maxY, this.state.offsetY)
    );
    if (
      nextOffsetX !== this.state.offsetX ||
      nextOffsetY !== this.state.offsetY
    ) {
      this.setState({
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
        shouldAnimateSnap: true,
      });
      this.setTimeout(() => {
        this.setState({shouldAnimateSnap: false});
      }, this.props.animationDuration);
    }
  };

  handleSwipeStart = ({x: clientX, y: clientY}: LightboxXY) => {
    this.currentAction = ACTION_SWIPE;
    this.swipeStartX = clientX;
    this.swipeStartY = clientY;
    this.swipeEndX = clientX;
    this.swipeEndY = clientY;
  };

  handleSwipe = ({x: clientX, y: clientY}: LightboxXY) => {
    this.swipeEndX = clientX;
    this.swipeEndY = clientY;
  };

  handleSwipeEnd = (event?: SyntheticEvent) => {
    const xDiff = this.swipeEndX - this.swipeStartX;
    const xDiffAbs = Math.abs(xDiff);
    const yDiffAbs = Math.abs(this.swipeEndY - this.swipeStartY);

    this.currentAction = ACTION_NONE;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeEndX = 0;
    this.swipeEndY = 0;

    if (!event || this.isAnimatingSnap() || xDiffAbs < yDiffAbs * 1.5) {
      return;
    }

    if (xDiffAbs < MIN_SWIPE_DISTANCE) {
      const boxRect = this.getLightboxRect();
      if (xDiffAbs < boxRect.width / 4) {
        return;
      }
    }

    if (xDiff > 0 && this.getPrevSrc()) {
      stopEvent(event);
      this.requestMovePrev();
    } else if (xDiff < 0 && this.getNextSrc()) {
      stopEvent(event);
      this.requestMoveNext();
    }
  };

  calculatePinchDistance = ([a, b] = this.pinchTouchList) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  calculatePinchCenter = ([a, b] = this.pinchTouchList) => ({
    x: a.x - (a.x - b.x) / 2,
    y: a.y - (a.y - b.y) / 2,
  });

  handlePinchStart = (pointerList: LightboxPointer[]) => {
    if (!this.props.enableZoom) {
      return;
    }
    this.currentAction = ACTION_PINCH;
    this.pinchTouchList = pointerList.map(({id, x, y}) => ({id, x, y}));
    this.pinchDistance = this.calculatePinchDistance();
  };

  handlePinch = (pointerList: LightboxPointer[]) => {
    this.pinchTouchList = this.pinchTouchList.map(oldPointer => {
      for (let i = 0; i < pointerList.length; i += 1) {
        if (pointerList[i].id === oldPointer.id) {
          return pointerList[i];
        }
      }

      return oldPointer;
    });

    const newDistance = this.calculatePinchDistance();

    const zoomLevel = this.state.zoomLevel + newDistance - this.pinchDistance;

    this.pinchDistance = newDistance;
    const {x: clientX, y: clientY} = this.calculatePinchCenter(
      this.pinchTouchList
    );
    this.changeZoom(zoomLevel, clientX, clientY);
  };

  handlePinchEnd = () => {
    this.currentAction = ACTION_NONE;
    this.pinchTouchList = [];
    this.pinchDistance = 0;
  };

  // Handle the window resize event
  handleWindowResize = () => {
    this.clearTimeout(this.resizeTimeout);
    this.resizeTimeout = this.setTimeout(this.forceUpdate.bind(this), 100);
  }

  handleZoomInButtonClick = () => {
    const nextZoomLevel = this.state.zoomLevel + ZOOM_BUTTON_INCREMENT_SIZE;
    this.changeZoom(nextZoomLevel);
    if (nextZoomLevel === MAX_ZOOM_LEVEL) {
      this.zoomOutBtn.current?.focus();
    }
  }

  handleZoomOutButtonClick = () => {
    const nextZoomLevel = this.state.zoomLevel - ZOOM_BUTTON_INCREMENT_SIZE;
    this.changeZoom(nextZoomLevel);
    if (nextZoomLevel === MIN_ZOOM_LEVEL) {
      this.zoomInBtn.current?.focus();
    }
  }

  // Detach key and mouse input events
  isAnimatingSnap = () => {
    const {animationDuration, animationDisabled} = this.props;
    const {shouldAnimateSnap} = this.state;

    if (!animationDuration || animationDisabled)
      return false;

    return shouldAnimateSnap;
  };

  // Check if image is loaded
  isImageLoaded = (imageSrc: string | undefined) => imageSrc && imageSrc in this.imageCache && this.imageCache[imageSrc].loaded;

  // Load image from src and call callback with image width and height on load
  loadImage({type, index, src, done}: { type: LightboxSrcType, index: number, src: string, done: ReactImageLightboxGenerateLoadError }) {
    // Return the image info if it is already cached
    if (this.isImageLoaded(src)) {
      this.setTimeout(() => {
        done();
      }, 1);
      return;
    }

    const inMemoryImage = new global.Image();

    if (this.props.images[index].crossOrigin) {
      inMemoryImage.crossOrigin = this.props.images[index].crossOrigin ?? null;
    }

    inMemoryImage.onerror = errorEvent => {
      this.props.onImageLoadError?.(src, type, index, errorEvent);

      // failed to load so set the state loadErrorStatus
      this.setState(prevState => ({
        loadErrorStatus: {...prevState.loadErrorStatus, [type]: true},
      }));

      done(errorEvent);
    };

    inMemoryImage.onload = () => {
      this.props.onImageLoad?.(src, type, index, inMemoryImage);

      this.imageCache[src] = {
        loaded: true,
        width: inMemoryImage.width,
        height: inMemoryImage.height,
      };

      done();
    };

    inMemoryImage.src = src;
  }

  // Load all images and their thumbnails
  loadAllImages = () => {
    const generateLoadDoneCallback: ReactImageLightboxGenerateLoadDoneCallback = (type, index, imageSrc) => (err) => {
      // Give up showing image on error
      if (err) {
        return;
      }

      // Don't rerender if the src is not the same as when the load started
      // or if the component has unmounted
      const newImages = this.props.images;
      const propSrc = type.startsWith("full") ? newImages[index].full : newImages[index].thumbnail;
      if (propSrc !== imageSrc || this.didUnmount) {
        return;
      }

      // Force rerender with the new image
      this.forceUpdate();
    };

    const indexes = this.updateLoadableIndexes();

    // Load the images
    IMAGE_KEYS.forEach(type => {
      this.props.images.forEach((image, index) => {
        const imageKey = `${type}-${index}` as LightboxSrcType;
        const src = image.full;

        // Only visible ones
        if (!indexes.includes(index))
          return;

        const loadErrorStatus = this.state.loadErrorStatus as LightboxLoadErrorStatus;

        // there is no error when we try to load it initially
        if (src && index in loadErrorStatus && loadErrorStatus[imageKey]) {
          this.setState(prevState => ({
            loadErrorStatus: {
              ...prevState.loadErrorStatus,
              [imageKey]: false
            },
          }));
        }

        // Load unloaded images
        if (src && !this.isImageLoaded(src)) {
          this.loadImage({
            type: imageKey,
            index,
            src,
            done: generateLoadDoneCallback(imageKey, index, src)
          });
        }
      });
    });
  };

  // Request that the lightbox be closed
  requestClose = () => {
    this.props.onCloseRequest?.();
  }

  requestMovePage = (direction: "prev" | "next") => {
    // Reset the zoom level on image move
    const nextState: ReactImageLightboxState = {
      zoomLevel: MIN_ZOOM_LEVEL,
      offsetX: 0,
      offsetY: 0,
      loadErrorStatus: {},
      loadableIndexes: [],
    };

    this.keyPressed = false;
    this.moveRequested = true;

    if (direction === "prev") {
      this.keyCounter -= 1;
      this.setState(nextState);
      this.props.onMovePrevRequest?.();
    } else {
      this.keyCounter += 1;
      this.setState(nextState);
      this.props.onMoveNextRequest?.();
    }
  }

  // Request to transition to the next image
  requestMoveNext = () => {
    this.requestMovePage("next");
  }

  // Request to transition to the previous image
  requestMovePrev = () => {
    this.requestMovePage("prev");
  }

  render() {
    const {
      discourageDownloads,
      enableZoom,
      toolbarButtons,
      loader,
      footer,
      showToolbar,
      // Scroller props
      animationDisabled,
      animationDuration,
      images,
      activeIndex,
      loadAhead,
    } = this.props;
    const {
      zoomLevel,
      offsetX,
      offsetY,
      loadErrorStatus,
      loadableIndexes: indexes,
    } = this.state;

    const scrollerImages: RILScrollerImage[] = images.map((img, index) => {
      const shouldLoad = indexes.includes(index);
      const object = loadErrorStatus as LightboxLoadErrorStatus;

      const hasError = IMAGE_KEYS.some((key) => {
        const imgKey = `${key}-${index}` as LightboxSrcType;
        return object[imgKey];
      });

      return {
        ...img,
        shouldLoad,
        hasError,
        errorMessage: hasError && this.props.imageLoadErrorMessage,
      };
    });

    const zoomMultiplier = this.getZoomMultiplier();

    const activeImage = images.length > 0 ? images[Math.max(activeIndex, images.length - 1)] : undefined;

    return (
      <div // eslint-disable-line jsx-a11y/no-static-element-interactions
        className={classNames(
          "ril-outer",
          this.props.outerClassName
        )}
        ref={this.outerEl}
        onWheel={this.handleOuterMousewheel}
        onMouseMove={this.handleMouseMove}
        onMouseDown={this.handleMouseDown}
        onTouchStart={this.handleTouchStart}
        onTouchMove={this.handleTouchMove}
        tabIndex={-1} // Enables key handlers on div
        onKeyDown={this.handleKeyInput}
        onKeyUp={this.handleKeyInput}
      >
        {showToolbar && <div className={classNames("ril-toolbar", this.props.toolbarClassName)}>
          <ul className="ril-toolbar-side ril-toolbar-left">
            <li className="ril-toolbar-item">
              <span className="ril-toolbar-item-child">{activeImage?.title}</span>
            </li>
          </ul>

          <ul className="ril-toolbar-side ril-toolbar-right">
            {toolbarButtons &&
              toolbarButtons.map((button, i) => <li key={`button_${i + 1}`} className="ril-toolbar-item">{button}</li>)
            }

            {enableZoom && (
              <ToolbarButton
                ref={this.zoomInBtn}
                key="zoom-in"
                label={this.props.zoomInLabel}
                className="ril-zoom-in"
                disabled={this.isAnimatingSnap() || zoomLevel === MAX_ZOOM_LEVEL}
                onClick={this.handleZoomInButtonClick}
              />
            )}

            {enableZoom && (
              <ToolbarButton
                ref={this.zoomOutBtn}
                key="zoom-out"
                label={this.props.zoomOutLabel}
                className="ril-zoom-out"
                disabled={this.isAnimatingSnap() || zoomLevel === MIN_ZOOM_LEVEL}
                onClick={this.handleZoomOutButtonClick}
              />
            )}

            <ToolbarButton
              key="close"
              label={this.props.closeLabel}
              className="ril-close"
              disabled={this.isAnimatingSnap()}
              onClick={this.requestClose}
            />
          </ul>
        </div>}

        <Scroller
          key="scroller"
          ref={this.currentEl}
          className={this.props.innerClassName}
          images={scrollerImages}
          {...{
            x: -1 * offsetX,
            y: -1 * offsetY,
            zoom: zoomMultiplier,
          }}
          isSnapAnimating={!animationDisabled && this.isAnimatingSnap()}
          onImageDoubleClick={this.handleImageDoubleClick}
          onImageWheel={this.handleImageMouseWheel}
          getBestImageForType={this.getBestImageForType}
          loader={loader}
          activeIndex={activeIndex}
          loadAhead={loadAhead}
          animationDuration={animationDuration}
          animationDisabled={animationDisabled}
          discourageDownloads={discourageDownloads}
        />

        {footer && <div className={classNames("ril-bottom-bar", this.props.footerClassName)}>
          {footer}
        </div>}

        {this.getPrevSrc() && <button
          type="button"
          className="ril-nav-buttons ril-prev-button"
          key="prev"
          aria-label={this.props.prevLabel}
          title={this.props.prevLabel}
          onClick={!this.isAnimatingSnap() ? this.requestMovePrev : undefined} // Ignore clicks during animation
        />}

        {this.getNextSrc() && <button
          type="button"
          className="ril-nav-buttons ril-next-button"
          key="next"
          aria-label={this.props.nextLabel}
          title={this.props.nextLabel}
          onClick={!this.isAnimatingSnap() ? this.requestMoveNext : undefined} // Ignore clicks during animation
        />}
      </div>
    );
  }
}

export default ReactImageLightbox;
