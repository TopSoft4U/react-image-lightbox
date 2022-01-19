import {mount} from "enzyme";
import React from "react";
import Lightbox from "../index";
import {getHighestSafeWindowContext, loadableIndexes} from "../util";
import {KEYS, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, ZOOM_BUTTON_INCREMENT_SIZE} from "../constant";

// Mock the loadStyles static function to avoid
// issues with a lack of styles._insertCss
Lightbox.loadStyles = jest.fn();

const imageOne = [
  {
    full: "/fake/image/src.jpg",
  }
];

const imageMulti = [
  {
    full: "/fake/image/src1.jpg",
  },
  ...imageOne,
  {
    full: "/fake/image/src2.jpg",
    title: "Some title"
  },
];

const commonProps = {
  images: imageMulti,
  activeIndex: 0,
  onCloseRequest: () => {
  },
};

const extendedCommonProps = {
  ...commonProps,
  images: imageMulti,
  activeIndex: 1,
};

describe("Lightbox structure", () => {
  const wrapper = mount(<Lightbox {...commonProps} />);

  it("does not contain prev button when infiniteScrolling is disabled and image is first active", () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: 0});
    expect(wrapper.find(".ril-prev-button").length).toEqual(0);
  });

  it("contains prev button when when infiniteScrolling is disabled and image is NOT first active", () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: 1});
    expect(wrapper.find(".ril-prev-button").length).toEqual(1);
  });

  it("contains prev button when infiniteScrolling is enabled and image is first active", () => {
    wrapper.setProps({infiniteScrolling: true, activeIndex: 0});
    expect(wrapper.find(".ril-prev-button").length).toEqual(1);
  });

  it("contains prev button when infiniteScrolling is enabled and image is NOT first active", () => {
    wrapper.setProps({infiniteScrolling: true, activeIndex: 1});
    expect(wrapper.find(".ril-prev-button").length).toEqual(1);
  });

  it("does not contain next button when infiniteScrolling is disabled and image is last active", () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: commonProps.images.length - 1});
    expect(wrapper.find(".ril-next-button").length).toEqual(0);
  });

  it("contains next button when when infiniteScrolling is disabled and image is NOT last active", () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: commonProps.images.length - 2});
    expect(wrapper.find(".ril-next-button").length).toEqual(1);
  });

  it("contains next button when infiniteScrolling is enabled and image is last active", () => {
    wrapper.setProps({infiniteScrolling: true, activeIndex: commonProps.images.length - 1});
    expect(wrapper.find(".ril-next-button").length).toEqual(1);
  });

  it("contains next button when infiniteScrolling is enabled and image is NOT first active", () => {
    wrapper.setProps({infiniteScrolling: true, activeIndex: commonProps.images.length - 2});
    expect(wrapper.find(".ril-next-button").length).toEqual(1);
  });

  it("contains zoom buttons when enableZoom is true (default)", () => {
    expect(wrapper.find("button.ril-zoom-out").length).toEqual(1);
    expect(wrapper.find("button.ril-zoom-in").length).toEqual(1);
  });

  it("does not contain zoom buttons when enableZoom is false", () => {
    wrapper.setProps({enableZoom: false});
    expect(wrapper.find("button.ril-zoom-out").length).toEqual(0);
    expect(wrapper.find("button.ril-zoom-in").length).toEqual(0);
  });

  it("does not contain a bottom bar when no footer prop is empty", () => {
    expect(wrapper.find(".ril-bottom-bar").length).toEqual(0);
  });

  it("contains a bottom bar when a footer prop is supplied", () => {
    wrapper.setProps({footer: <div>test</div>});
    expect(wrapper.find(".ril-bottom-bar").length).toEqual(1);
  });

  it("contains a top bar when showToolbar is true (default)", () => {
    expect(wrapper.find(".ril-toolbar").length).toEqual(1);
  });

  it("does not contain a top bar when showToolbar is set to false", () => {
    wrapper.setProps({showToolbar: false});
    expect(wrapper.find(".ril-toolbar").length).toEqual(0);
    wrapper.setProps({showToolbar: true});
  });

  it("contains custom toolbar buttons when supplied", () => {
    wrapper.setProps({
      // eslint-disable-next-line react/jsx-key
      toolbarButtons: [<button type="button" className="my-test-button" />],
    });
    expect(wrapper.find(".ril-toolbar-item .my-test-button").length).toEqual(1);
  });

  it("contains image title when supplied", () => {
    const imageWithTitle = imageMulti.findIndex(x => x.title);
    wrapper.setProps({activeIndex: imageWithTitle});

    expect(
      wrapper.find(".ril-toolbar-left .ril-toolbar-item-child").text()
    ).toEqual("Some title");
  });
});

describe("Events", () => {
  const LOAD_FAILURE_SRC = "LOAD_FAILURE_SRC";
  const LOAD_SUCCESS_SRC = "LOAD_SUCCESS_SRC";

  let originalImageSrcProto;
  beforeAll(() => {
    jest.useRealTimers();

    originalImageSrcProto = Object.getOwnPropertyDescriptor(
      global.Image.prototype,
      "src"
    );

    Object.defineProperty(global.Image.prototype, "src", {
      set(src) {
        if (src === LOAD_FAILURE_SRC) {
          setTimeout(() => this.onerror(new Error("mock error")));
        } else if (src === LOAD_SUCCESS_SRC) {
          setTimeout(this.onload);
        }
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(global.Image.prototype, "src", originalImageSrcProto);
  });

  const mockFns = {
    onCloseRequest: jest.fn(),
    onMovePrevRequest: jest.fn(),
    onMoveNextRequest: jest.fn(),
    onImageLoad: jest.fn(),
    onImageLoadError: jest.fn(),
  };

  const wrapper = mount(
    <Lightbox {...extendedCommonProps} {...mockFns} animationDisabled />
  );

  // Spy zoomBtn focus
  const {zoomOutBtn, zoomInBtn} = wrapper.instance();
  jest.spyOn(zoomOutBtn.current, "focus");
  jest.spyOn(zoomInBtn.current, "focus");

  it("Calls onMovePrevRequest when left button clicked", () => {
    expect(mockFns.onMovePrevRequest).toHaveBeenCalledTimes(0);
    wrapper.find(".ril-prev-button").simulate("click");
    expect(mockFns.onMovePrevRequest).toHaveBeenCalledTimes(1);
    expect(mockFns.onMovePrevRequest).toHaveBeenCalledWith();
  });

  it("Calls onMoveNextRequest when right button clicked", () => {
    expect(mockFns.onMoveNextRequest).toHaveBeenCalledTimes(0);
    wrapper.find(".ril-next-button").simulate("click");
    expect(mockFns.onMoveNextRequest).toHaveBeenCalledTimes(1);
    expect(mockFns.onMoveNextRequest).toHaveBeenCalledWith();
  });

  it("Calls onCloseRequest when close button clicked", () => {
    expect(mockFns.onCloseRequest).toHaveBeenCalledTimes(0);
    wrapper.find("button.ril-close").simulate("click");
    expect(mockFns.onCloseRequest).toHaveBeenCalledTimes(1);
    expect(mockFns.onCloseRequest).toHaveBeenCalledWith();
  });

  it("Calls onImageLoad when image loaded", done => {
    mockFns.onImageLoad.mockImplementationOnce((imageSrc, srcType, index, image) => {
      expect(imageSrc).toEqual(LOAD_SUCCESS_SRC);
      expect(srcType).toEqual("full-0");
      expect(index).toEqual(0);
      expect(image).toBeInstanceOf(global.Image);
      done();
    });

    expect(mockFns.onImageLoad).toHaveBeenCalledTimes(0);
    wrapper.setProps({images: [{full: LOAD_SUCCESS_SRC}], activeIndex: 0});
  });

  it("Calls onImageLoadError when image loaded", done => {
    mockFns.onImageLoadError.mockImplementationOnce((imageSrc, srcType, index, image) => {
      expect(imageSrc).toEqual(LOAD_FAILURE_SRC);
      expect(srcType).toEqual("full-0");
      expect(index).toEqual(0);
      expect(image).toBeInstanceOf(Error);
      done();
    }
    );

    expect(mockFns.onImageLoadError).toHaveBeenCalledTimes(0);
    wrapper.setProps({images: [{full: LOAD_FAILURE_SRC}], activeIndex: 0});
  });

  it("Calls the the ZoomIn Focus when ZoomOut is disabled", () => {
    wrapper.setState({
      zoomLevel: MIN_ZOOM_LEVEL + ZOOM_BUTTON_INCREMENT_SIZE,
    });
    wrapper.instance().handleZoomOutButtonClick();
    expect(zoomInBtn.current.focus).toHaveBeenCalledTimes(1);
  });

  it("Calls the the ZoomOut Focus when ZoomIn is disabled", () => {
    wrapper.setState({
      zoomLevel: MAX_ZOOM_LEVEL - ZOOM_BUTTON_INCREMENT_SIZE,
    });
    wrapper.instance().handleZoomInButtonClick();
    expect(zoomOutBtn.current.focus).toHaveBeenCalledTimes(1);
  });
});

describe("Key bindings", () => {
  const mockCloseRequest = jest.fn();
  const mockMovePrevRequest = jest.fn();
  const mockMoveNextRequest = jest.fn();

  const wrapper = mount(
    <Lightbox
      {...commonProps}
      onCloseRequest={mockCloseRequest}
      onMovePrevRequest={mockMovePrevRequest}
      onMoveNextRequest={mockMoveNextRequest}
    />
  );

  const simulateKey = key => {
    // Avoid interference by key throttling
    wrapper.instance().lastKeyDownTime = new Date("1970-01-01").getTime();

    wrapper.find(".ril-outer").simulate("keyDown", {key});
  };

  it("Responds to close key binding", () => {
    expect(mockCloseRequest).not.toBeCalled();

    // Simulate ESC key press
    simulateKey(KEYS.ESC);

    expect(mockCloseRequest).toBeCalled();
  });

  it('Doesn\'t respond to "move to next" key binding when no next image available', () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: commonProps.images.length - 1});

    expect(mockMoveNextRequest).not.toBeCalled();

    // Simulate right arrow key press
    simulateKey(KEYS.RIGHT_ARROW);

    expect(mockMoveNextRequest).not.toBeCalled();
  });

  it('Responds to "move to next" key binding when next image available', () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: commonProps.images.length - 2});

    expect(mockMoveNextRequest).not.toBeCalled();

    // Simulate right arrow key press
    simulateKey(KEYS.RIGHT_ARROW);

    expect(mockMoveNextRequest).toBeCalled();
  });

  it('Doesn\'t respond to "move to prev" key binding when no prev image available', () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: 0});

    expect(mockMovePrevRequest).not.toBeCalled();

    // Simulate left arrow key press
    simulateKey(KEYS.LEFT_ARROW);

    expect(mockMovePrevRequest).not.toBeCalled();
  });

  it('Responds to "move to prev" key binding', () => {
    wrapper.setProps({infiniteScrolling: false, activeIndex: commonProps.images.length - 1});

    expect(mockMovePrevRequest).not.toBeCalled();

    // Simulate left arrow key press
    simulateKey(KEYS.LEFT_ARROW);

    expect(mockMovePrevRequest).toBeCalled();
  });
});

describe("Snapshot Testing", () => {
  it('Lightbox renders properly"', () => {
    const wrapper = mount(<Lightbox {...commonProps} />);
    expect(wrapper).toMatchSnapshot();
  });
});

describe("Error Testing", () => {
  it("Should render the default error message", () => {
    const wrapper = mount(<Lightbox {...commonProps} />);
    wrapper.setState({
      loadErrorStatus: {"full-0": true},
    });
    wrapper.update();
    expect(wrapper.find("div.ril-error-container").at(0)).toHaveText("This image failed to load");
  });
  it("Should render the specified error message", () => {
    const wrapper = mount(<Lightbox {...commonProps} />);
    const imageLoadErrorMessage = <p>Specified Error Message</p>;
    wrapper.setState({
      loadErrorStatus: {"full-0": true},
    });
    wrapper.setProps({
      imageLoadErrorMessage,
    });
    wrapper.update();
    expect(wrapper.find("div.ril-error-container").at(0)).toContainReact(imageLoadErrorMessage);
  });
});

describe("Utils", () => {
  it("getHighestSafeWindowContext function if parent is the same origin", () => {
    const self = {
      location: {href: "http://test.test"},
      document: {referrer: "http://test.test"},
    };
    expect(getHighestSafeWindowContext(self)).toBe(global.window.top);
  });

  it("does not generate indexes behind 0 when infinite scrolling is disabled", () => {
    const result = loadableIndexes(10, 0, 3, false);

    expect(result).toEqual([0, 1, 2, 3]);
  });

  it("does generate indexes behind 0 when infinite scrolling is enabled", () => {
    const result = loadableIndexes(10, 0, 3, true);

    expect(result).toEqual([7, 8, 9, 0, 1, 2, 3]);
  });

  it("return empty array when searched index is outside of array bounds", () => {
    const result = loadableIndexes(5, 10, 3, true);

    expect(result).toEqual([]);
  });

  it.skip("getHighestSafeWindowContext function if parent is a different origin", () => {
    const self = {
      location: {href: "http://test1.test"},
      document: {referrer: "http://test.test"},
    };
    expect(getHighestSafeWindowContext(self)).toBe(self);
  });
});
