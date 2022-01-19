import {forwardRef,MouseEventHandler} from "react";
import classNames from "classnames";

type ToolbarButtonProps = {
  label?: string,
  className?: string,
  disabled?: boolean,
  onClick?: MouseEventHandler<HTMLButtonElement>
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({label, className, disabled = false, onClick}, ref) => {
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
            "ril-toolbar-item-child",
            "ril-builtin-btn",
            className,
            {
              "ril-builtin-btn-disabled": disabled,
            }
          )}
          onClick={!disabled ? onClick : undefined}
        />
      </li>
    );
  }
);

export default ToolbarButton;
