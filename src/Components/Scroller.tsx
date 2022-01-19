import classNames from "classnames";
import {CSSProperties, forwardRef, MouseEventHandler, useMemo, WheelEventHandler} from "react";
import {LightboxTransform, ReactImageLightboxProps, RILBestImageForType, RILScrollerImage} from "../types";
import {stopEvent} from "../util";
import Loader from "./Loader";

// import Loader from "./Components/Loader";

type ScrollerProps = Pick<ReactImageLightboxProps, "activeIndex" | "loadAhead" | "animationDisabled" | "animationDuration" | "loader" | "discourageDownloads"> &
  LightboxTransform & {
  images: RILScrollerImage[];
  getBestImageForType: (index: number) => RILBestImageForType | undefined;
  className?: string;
  imageClassName?: string;
  isSnapAnimating?: boolean;
  onImageDoubleClick: MouseEventHandler<HTMLDivElement>;
  onImageWheel: WheelEventHandler<HTMLDivElement>;
};

const getTransform = ({x = 0, y = 0, zoom = 1}: Partial<LightboxTransform>): CSSProperties => ({
  transform: `translate3d(${x}px,${y}px,0) scale3d(${zoom},${zoom},${zoom})`,
});

const Scroller = forwardRef<HTMLDivElement, ScrollerProps>((
  {
    className, imageClassName,
    animationDisabled, animationDuration, isSnapAnimating,
    images, activeIndex, loadAhead,
    onImageDoubleClick, onImageWheel,
    getBestImageForType,
    discourageDownloads,
    loader,
    x, y, zoom,
  },
  ref
) => {

  const scrollerStyle: CSSProperties = useMemo(() => ({
    transform: `translate3d(${activeIndex * -100}%, 0, 0)`,
    transition: animationDisabled ? undefined : `transform ${animationDuration}ms`
  }), [activeIndex, animationDisabled, animationDuration]);

  return <div className={classNames("ril-inner", className)} style={scrollerStyle}>
    <div className="ril-test">
      {images.map((image, i) => {
        const isCurrent = activeIndex === i;

        let style: CSSProperties = {};
        let imageInfo: RILBestImageForType | undefined = undefined;

        if (image.shouldLoad) {
          imageInfo = getBestImageForType(i);
          style.backgroundImage = discourageDownloads ? `url('${image.full}')` : undefined;
        }

        if (isCurrent) {
          style = {
            ...style,
            // TODO cursor if zoom = MIN_LEVEL
            transition: isSnapAnimating ? `transform ${animationDuration}ms` : undefined,
            ...getTransform({x, y, zoom}),
          };
        }

        const isError = image.shouldLoad && !imageInfo && image.hasError;
        const isLoading = !isError && image.shouldLoad && !imageInfo && !image.hasError;
        const isReady = !isLoading && image.shouldLoad && imageInfo;

        if (isLoading && style.backgroundImage) {
          delete style.backgroundImage;
        }

        return <div
          key={`${image.full}-${activeIndex}-${i}`}
          ref={isCurrent ? ref : undefined}
          className={classNames(
            "ril-image-wrapper",
            {
              "ril-errored": isError,
              "ril-not-loaded": isLoading,
              "ril-image-discourager": discourageDownloads && isReady,
            },
            imageClassName
          )}
          onDoubleClick={isCurrent ? onImageDoubleClick : undefined}
          onWheel={isCurrent ? onImageWheel : undefined}
          onDragStart={stopEvent}
          style={style}
        >
          {!image.shouldLoad && <div className="ril-filler" />}
          {isError && <div className="ril-error-container">
            {image.errorMessage}
          </div>}
          {isLoading && <div className="ril-loading-container">
            {loader !== undefined ? loader : <Loader />}
          </div>}
          {discourageDownloads && isReady && <div className="ril-download-blocker" />}
          {!discourageDownloads && isReady && <img
            className={classNames("ril-image", imageClassName)}
            alt={typeof image.title === "string" ? image.title : ""}
            draggable={false}
            crossOrigin={image.crossOrigin}
            src={image.full}
          />}
        </div>;
      })}
    </div>
  </div>;
});

export default Scroller;
