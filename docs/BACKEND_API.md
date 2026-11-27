# Backend API inventory

## Current decision

There are no Vercel API routes, Firebase Functions, custom server, or Firebase Admin SDK in this repository. No route is currently required for the implemented Firestore client operations because Firebase Auth plus Firestore Security Rules enforce verified-user ownership. Adding a second CRUD API would duplicate the existing client SDK path without improving authorization.

The frontend build is prepared for Vercel static hosting. The SPA rewrite targets `index.html`; there are no `/api/*` handlers today. If a future API is added, routing must be tested with both its endpoint and SPA paths before the catch-all is changed.

## Operations that would justify a server route

Only introduce a route when a concrete trusted operation cannot safely run through a client SDK, such as a private third-party AI credential, signed object-storage upload, or server-side integrity verification. Before adding one, define the endpoint schema, authentication, ownership rules, payload size, abuse controls, timeout, safe errors, logging policy, and tests. Any Firebase Admin operation must independently verify Firebase ID tokens and resource ownership because Admin SDK bypasses Firestore rules.

No Admin service account, Gemini API key, Storage bucket access, or Vercel secret was available or created in this task. No API behavior is claimed as implemented.
