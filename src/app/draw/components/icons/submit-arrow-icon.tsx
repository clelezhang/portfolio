interface SubmitArrowIconProps {
  size?: number;
}

export function SubmitArrowIcon({ size = 12 }: SubmitArrowIconProps) {
  return (
    <span
      className="draw-icon-mask draw-icon-arrow"
      style={{ width: size, height: size }}
    />
  );
}
