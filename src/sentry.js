import * as Sentry from '@sentry/react';

const DSN = import.meta.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
}

// Capture unhandled promise rejections not already caught by Sentry's defaults
window.addEventListener('unhandledrejection', (event) => {
  if (DSN) Sentry.captureException(event.reason);
});

export { Sentry };
