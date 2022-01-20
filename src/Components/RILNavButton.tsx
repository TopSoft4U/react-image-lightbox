import {forwardRef, RefAttributes} from "react";
import classNames from "classnames";

export type RILNavButtonProps = Omit<RefAttributes<HTMLButtonElement>, "key"> & {
  className?: string;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const RILNavButton = forwardRef<HTMLButtonElement, RILNavButtonProps>(({className, title, onClick, disabled}, ref) => {
  return <button
    ref={ref}
    type="button"
    className={classNames("ril-nav-buttons", className)}
    aria-label={title}
    title={title}
    disabled={disabled}
    onClick={!disabled ? onClick : undefined} // Ignore clicks during animation
  />;
});

export default RILNavButton;
