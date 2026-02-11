import { ReactNode } from 'react';
import { StatefulTooltip, PLACEMENT } from 'baseui/tooltip';
import { TOOLTIP_OVERRIDES } from '../constants';

interface DrawIconButtonProps {
  icon: string;
  onClick: () => void;
  tooltip?: string;
  tooltipPlacement?: 'top' | 'bottom';
  isSelected?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'tool';
  className?: string;
  iconClassName?: string;
  popperOffset?: number;
  children?: ReactNode;
}

export function DrawIconButton({
  icon,
  onClick,
  tooltip,
  tooltipPlacement = 'top',
  isSelected = false,
  isActive = false,
  size = 'md',
  className = '',
  iconClassName = '',
  popperOffset = 21,
  children,
}: DrawIconButtonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    tool: 'draw-tool-icon',
  };

  const buttonClasses = {
    sm: 'draw-icon-btn draw-icon-btn--sm',
    md: 'draw-header-icon-btn',
    lg: 'draw-icon-btn',
    tool: 'draw-tool-btn',
  };

  const activeClass = isActive ? 'draw-icon-btn--active' : '';
  const selectedClass = isSelected && size === 'tool' ? 'draw-tool-icon--selected' : '';

  const popperOptions = {
    modifiers: [{ name: 'offset', options: { offset: [0, popperOffset] } }],
  };

  const placement = tooltipPlacement === 'top' ? PLACEMENT.top : PLACEMENT.bottom;

  const buttonContent = (
    <button
      onClick={onClick}
      className={`${buttonClasses[size]} ${activeClass} ${className}`.trim()}
    >
      {children ?? (
        size === 'tool' ? (
          <img
            src={`/draw/${icon}.svg`}
            alt=""
            className={`${sizeClasses[size]} ${selectedClass} ${iconClassName}`.trim()}
            style={{ bottom: isSelected ? '-2px' : '-20px' }}
          />
        ) : (
          <img
            src={`/draw/${icon}.svg`}
            alt=""
            className={`${sizeClasses[size]} draw-stroke-icon ${iconClassName}`.trim()}
          />
        )
      )}
    </button>
  );

  if (!tooltip) {
    return buttonContent;
  }

  return (
    <StatefulTooltip
      content={tooltip}
      placement={placement}
      showArrow
      onMouseEnterDelay={400}
      overrides={TOOLTIP_OVERRIDES}
      popperOptions={popperOptions}
    >
      {buttonContent}
    </StatefulTooltip>
  );
}
