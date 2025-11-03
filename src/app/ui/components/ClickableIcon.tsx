
interface ClickableIconProps {
  onClick: () => void;
  children: React.ReactNode;
}

function ClickableIcon({ onClick, children }: ClickableIconProps) {
  return (
    <div 
      style={{ cursor: 'pointer' }} 
      onClick={onClick} 
    >
      {children} 
    </div>
  );
}

export default ClickableIcon;