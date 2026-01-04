export default function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-sand-200 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-ink-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-ink-800 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-ink-500 max-w-xs mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

