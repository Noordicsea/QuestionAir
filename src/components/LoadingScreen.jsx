export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-sand-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-ink-300 border-t-ink-700 rounded-full animate-spin" />
        <p className="text-sm text-ink-500">Loading...</p>
      </div>
    </div>
  );
}

