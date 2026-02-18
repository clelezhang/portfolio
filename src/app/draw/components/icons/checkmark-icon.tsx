interface CheckmarkIconProps {
  size?: number;
}

export function CheckmarkIcon({ size = 12 }: CheckmarkIconProps) {
  return (
    <span
      className="draw-icon-mask draw-icon-checkmark"
      style={{ width: size, height: size }}
    />
  );
}
