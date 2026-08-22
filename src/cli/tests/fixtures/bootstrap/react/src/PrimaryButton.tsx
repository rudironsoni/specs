export function PrimaryButton({
  appearance = 'primary',
  disabled = false,
  onClick,
  children,
}: {
  appearance?: 'primary' | 'secondary' | 'tertiary';
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" disabled={disabled} style={{ background: '#1a73e8' }} onClick={onClick}>
      {children}
    </button>
  );
}
