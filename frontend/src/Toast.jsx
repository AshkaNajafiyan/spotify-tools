export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-black/80 text-white px-4 py-2 rounded-xl shadow-lg border border-white/10 backdrop-blur-sm">
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}
