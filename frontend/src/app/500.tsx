// Next.js 15 App Router: 500.tsx is a special file for server errors
// Workaround: Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export default function Custom500() {
  return (
    <div>
      <h1>500</h1>
      <h2>Server Error</h2>
      <p>Something went wrong on the server.</p>
      <a href="/">Go back home</a>
    </div>
  );
}
