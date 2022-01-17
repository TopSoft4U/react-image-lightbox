import React, { forwardRef } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

const ToolbarButton = forwardRef(
  ({ label, className, disabled, onClick }, ref) => {
    return (
      <li className="ril-toolbar-item">
        <button
          ref={ref}
          type="button"
          key="close"
          aria-label={label}
          title={label}
          disabled={disabled}
          className={classNames(
            'ril-toolbar-item-child',
            'ril-builtin-btn',
            className,
            {
              'ril-builtin-btn-disabled': disabled,
            }
          )}
          onClick={!disabled ? onClick : undefined}
        />
      </li>
    );
  }
);

ToolbarButton.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

ToolbarButton.defaultProps = {
  label: undefined,
  className: undefined,
  disabled: false,
  onClick: () => {},
};

export default ToolbarButton;
