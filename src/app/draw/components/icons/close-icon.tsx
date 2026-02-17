interface CloseIconProps {
  size?: number;
}

export function CloseIcon({ size = 12 }: CloseIconProps) {
  return (
    <span
      className="draw-icon-mask draw-icon-close"
      style={{ width: size, height: size }}
    />
  );
}
