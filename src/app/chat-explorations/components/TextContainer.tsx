interface TextContainerProps {
  children: React.ReactNode;
}

export function TextContainer({ children }: TextContainerProps) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {children}
    </div>
  );
}
