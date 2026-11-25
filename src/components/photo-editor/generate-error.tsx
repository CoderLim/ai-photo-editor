/** Inline failure copy shown above the generate button (toast still fires). */
export function GenerateError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="mb-2 text-center text-sm text-red-600"
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
