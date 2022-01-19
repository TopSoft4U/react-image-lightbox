const Loader = () => {
  return (
    <div className="ril-loader">
      <svg
        className="svg-container"
        height="100"
        width="100"
        viewBox="0 0 100 100"
      >
        <circle
          className="ril-loader-svg ril-loader-bg"
          cx="50"
          cy="50"
          r="45"
        />
        <circle
          className="ril-loader-svg ril-loader-animate"
          cx="50"
          cy="50"
          r="45"
        />
      </svg>
    </div>
  );
};

export default Loader;
