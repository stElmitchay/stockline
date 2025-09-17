export const runtime = 'edge';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">You are offline</h1>
        <p className="text-sm text-gray-500">
          Please check your connection. Some features may not be available offline.
        </p>
      </div>
    </main>
  );
}

