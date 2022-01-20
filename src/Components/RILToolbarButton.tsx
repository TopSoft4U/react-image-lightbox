import {forwardRef,MouseEventHandler} from "react";
import classNames from "classnames";

export type RILToolbarButtonProps = {
  title?: string,
  className?: string,
  disabled?: boolean,
  onClick?: MouseEventHandler<HTMLButtonElement>
};

const RILToolbarButton = forwardRef<HTMLButtonElement, RILToolbarButtonProps>(
  ({title, className, disabled = false, onClick}, ref) => {
    return (
      <li className="ril-toolbar-item">
        <button
          ref={ref}
          type="button"
          key="close"
          aria-label={title}
          title={title}
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

export default RILToolbarButton;
