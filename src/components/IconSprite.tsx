import React from 'react';

export const ICON_NAMES = {
  // Add your icon names here as you create them
  HEART: 'heart',
  CLOCK: 'clock',
  LAYOUT: 'layout',
  // ... more icons
} as const;

export type IconName = typeof ICON_NAMES[keyof typeof ICON_NAMES];

interface IconSpriteProps {
  name: IconName;
  width?: number | string;
  height?: number | string;
  className?: string;
  fill?: string;
  ariaLabel?: string;
}

export const IconSprite: React.FC<IconSpriteProps> = ({
  name,
  width = 24,
  height = 24,
  className,
  fill = 'currentColor',
  ariaLabel,
}) => {
  const titleId = ariaLabel ? `icon-title-${name}` : undefined;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      fill={fill}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? titleId : undefined}
      aria-hidden={!ariaLabel}
      focusable={ariaLabel ? undefined : 'false'}
    >
      {ariaLabel && titleId && (
        <title id={titleId}>{ariaLabel}</title>
      )}
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
};
