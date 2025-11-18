// Next.js 15 App Router: not-found.tsx is a special file
// It can return a standalone HTML document that bypasses the layout
// This prevents any layout wrapping issues during static generation

export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 - Page Not Found</title>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            text-align: center;
            max-width: 28rem;
            padding: 2rem;
          }
          h1 {
            font-size: 3.75rem;
            font-weight: bold;
            margin: 0;
          }
          h2 {
            margin-top: 1rem;
            font-size: 1.5rem;
            font-weight: 600;
          }
          p {
            margin-top: 0.5rem;
            color: #4b5563;
          }
          a {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 0.375rem;
            color: white;
            background-color: #2563eb;
            text-decoration: none;
            margin-top: 2rem;
          }
          a:hover {
            background-color: #1d4ed8;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <a href="/">Go back home</a>
        </div>
      </body>
    </html>
  );
}
