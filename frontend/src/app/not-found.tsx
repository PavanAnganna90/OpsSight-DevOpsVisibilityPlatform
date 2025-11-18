// Next.js 15 App Router: not-found.tsx is a special file
// It is ALWAYS statically generated at build time
// This component gets wrapped in the root layout automatically
// Keep it extremely simple - only primitive React elements

export default function NotFound() {
  return (
    <div>
      <h1>404</h1>
      <p>Page Not Found</p>
      <a href="/">Go back home</a>
    </div>
  );
}
