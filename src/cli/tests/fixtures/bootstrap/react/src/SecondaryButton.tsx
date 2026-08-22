export function SecondaryButton({ appearance = 'secondary', onPress, children }: {
  appearance?: 'primary' | 'secondary';
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" style={{ background: '#1a73e8' }} onClick={onPress}>
      {children}
    </button>
  );
}
