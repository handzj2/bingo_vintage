// src/app/dashboard/reversals/page.tsx
export default function ReversalsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Reversals</h1>
      <p className="text-gray-600 mt-1">Transaction reversals and corrections</p>
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-12 text-center">
        <p className="text-amber-800 font-medium">Admin-only feature</p>
        <p className="text-amber-600 text-sm mt-1">Policy 2026-01-10 enforcement</p>
      </div>
    </div>
  );
}