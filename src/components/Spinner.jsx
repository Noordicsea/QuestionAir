export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };
  
  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        border-ink-300 border-t-ink-700 
        rounded-full animate-spin
        ${className}
      `}
    />
  );
}

