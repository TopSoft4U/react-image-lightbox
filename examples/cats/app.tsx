/* eslint-disable import/no-extraneous-dependencies */
import {useState, useCallback} from "react";
import {Modal} from "react-bootstrap";
import {RILNavButtonProps} from "../../src/Components/RILNavButton";
import Lightbox from "../../src";
import "bootstrap/dist/css/bootstrap.min.css";
import "./stylesheets/vendor/stylesheet.css";
import "./stylesheets/app.css";

import {
  ReactImageLightboxProps,
  RILImageContentRendererProps,
} from "../../src/types";
import image1 from "./images/1.jpg";
import image1Thumb from "./images/1_thumb.jpg";

// import Lightbox from 'react-image-lightbox';
// In your own app, you would need to use import styles once in the app
// import 'react-image-lightbox/styles.css';

const images = [image1, undefined];
const thumbs = [image1Thumb, undefined];

const titles = [
  "",
  <span key="title-2">
    by&nbsp;
    <a className="creditLink" href="http://flickr.com/photos/titrans/">
      quatre mains
    </a>
    &nbsp; (
    <a
      className="creditLink"
      href="http://creativecommons.org/licenses/by/2.0/"
      title="Attribution License"
    >
      Some rights reserved
    </a>
    )
  </span>,
  <span key="title-3">
    by&nbsp;
    <a className="creditLink" href="http://flickr.com/photos/lachlanrogers/">
      latch.r
    </a>
    &nbsp; (
    <a
      className="creditLink"
      href="http://creativecommons.org/licenses/by-sa/2.0/"
      title="Attribution-ShareAlike License"
    >
      Some rights reserved
    </a>
    )
  </span>,
  <span key="title-4">
    by&nbsp;
    <a className="creditLink" href="http://flickr.com/photos/fazen/">
      fazen
    </a>
    &nbsp; (
    <a
      className="creditLink"
      href="http://creativecommons.org/licenses/by/2.0/"
      title="Attribution License"
    >
      Some rights reserved
    </a>
    )
  </span>,
];

const onImageLoad: ReactImageLightboxProps["onImageLoad"] = (
  imageSrc,
  _srcType,
  index
) => {
  console.log(`Loaded image ${imageSrc} - index: ${index}`); // eslint-disable-line no-console
};

const onImageLoadError: ReactImageLightboxProps["onImageLoadError"] = (
  imageSrc,
  type,
  index,
  errorEvent
) => {
  console.error(`Could not load image at ${imageSrc}`, errorEvent); // eslint-disable-line no-console
};

const CustomPrevButton = ({onClick, disabled, ref}: RILNavButtonProps) => {
  return (
    <button
      className="custom-prev-button"
      onClick={onClick}
      disabled={disabled}
      ref={ref}
    >
      Previous image
    </button>
  );
};

const ImageContentRenderer = ({index}: RILImageContentRendererProps) => {
  if (index !== 1) return null;
  console.log(index);
  return <div>xyz</div>;
};

const App = () => {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openLightbox = useCallback(() => setIsOpen(true), []);
  const closeLightbox = useCallback(() => setIsOpen(false), []);

  const moveNext = useCallback(
    () => setIndex((prev) => (prev + 1) % images.length),
    []
  );
  const movePrev = useCallback(
    () => setIndex((prev) => (prev + images.length - 1) % images.length),
    []
  );

  const onClick = useCallback(() => {
    setIndex(8);
  }, []);

  const lightbox = (
    <Modal fullscreen show={isOpen} onHide={closeLightbox}>
      <Modal.Body>
        <Lightbox
          images={images.map((img, i) => ({
            full: img,
            thumbnail: thumbs[i],
            title: titles[index],
          }))}
          activeIndex={index}
          onCloseRequest={closeLightbox}
          onMovePrevRequest={movePrev}
          onMoveNextRequest={moveNext}
          onImageLoadError={onImageLoadError}
          infiniteScrolling={true}
          discourageDownloads={true}
          singleClickZoom={true}
          onImageLoad={onImageLoad}
          prevButtonRenderer={CustomPrevButton}
          loadAhead={1}
          footer={
            <div style={{height: "50px"}}>
              <button onClick={onClick}>test</button>
            </div>
          }
          imageContentRenderer={ImageContentRenderer}
        />
      </Modal.Body>
    </Modal>
  );

  return (
    <div>
      <section className="page-header">
        <h1 className="project-name">React Image Lightbox</h1>

        <h2 className="project-tagline">
          Flexible lightbox component for displaying images with React
        </h2>
      </section>

      <section className="main-content">
        <h2>Demo</h2>

        <div>
          <button
            type="button"
            id="open-lightbox"
            className="demoButton"
            onClick={openLightbox}
          >
            Open Lightbox
          </button>
          {lightbox}
        </div>

        <h2>Features</h2>
        <ul>
          <li>Keyboard shortcuts (with rate limiting)</li>
          <li>Image Zoom</li>
          <li>Flexible rendering using src values assigned on the fly</li>
          <li>Image preloading for smoother viewing</li>
          <li>
            Mobile friendly, with pinch to zoom and swipe (Thanks,{" "}
            <a href="https://github.com/webcarrot">@webcarrot</a>
            !)
          </li>
        </ul>

        <a href="https://github.com/frontend-collective/react-image-lightbox">
          Examples and Documentation on Github
        </a>

        <footer className="site-footer">
          <span className="site-footer-owner">
            <a href="https://github.com/frontend-collective/react-image-lightbox">
              React Image Lightbox
            </a>{" "}
            is maintained by{" "}
            <a href="https://github.com/frontend-collective">
              Frontend Collective
            </a>
            .
          </span>

          <span className="site-footer-credits">
            This page was generated by{" "}
            <a href="https://pages.github.com">GitHub Pages</a> using the{" "}
            <a href="https://github.com/jasonlong/cayman-theme">Cayman theme</a>{" "}
            by <a href="https://twitter.com/jasonlong">Jason Long</a>.
          </span>
        </footer>
      </section>

      <a href="https://github.com/frontend-collective/react-image-lightbox">
        <img
          style={{position: "absolute", top: 0, right: 0, border: 0}}
          src="https://camo.githubusercontent.com/38ef81f8aca64bb9a64448d0d70f1308ef5341ab/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f6461726b626c75655f3132313632312e706e67"
          alt="Fork me on GitHub"
          data-canonical-src="https://s3.amazonaws.com/github/ribbons/forkme_right_darkblue_121621.png"
        />
      </a>
    </div>
  );
};

export default App;
