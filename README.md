Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Remove `@tailwindcss/vite` and `tailwindcss` from `package.json`

## Linting & Formatting

This project uses [eslint](https://eslint.org/) for linting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
pnpm lint
pnpm format
pnpm check
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map(person => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).

# Deploying to Cloudflare Workers

This project is set up to deploy to Cloudflare Workers (`@cloudflare/vite-plugin` + `wrangler`); see `wrangler.jsonc`.

Environment variables follow the official Vite convention: public `VITE_*` variables are statically inlined at `vite build`. **The committed `.env` is the production public baseline** (production MapTiler key, `pk_live_` Clerk publishable key, etc. — all values safe to expose). For local development, override them with dev values in `.env.local` (gitignored); Vite loads `.env.local` with higher priority than `.env` in every mode, so `pnpm dev` uses dev values and never touches the production instances. Secrets (`CLERK_SECRET_KEY`, no `VITE_` prefix) are never committed: keep them in `.env.local` locally and a Cloudflare Worker Secret in production.

## Manual steps you need to do

1. **Local `.env.local`** (gitignored, never commit): set the dev `CLERK_SECRET_KEY`; if you want the dev instances locally, also override `VITE_MAPTILER_API_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` with dev values.
2. **Real backend**: set `VITE_API_BASE_URL` in `.env` to the real backend URL (changes to `.env` require a fresh `pnpm build`; leave empty until available).
3. **Production secret**: set `CLERK_SECRET_KEY` on Cloudflare:

   ```bash
   pnpm exec wrangler secret put CLERK_SECRET_KEY
   ```

   (or add it in the Cloudflare dashboard: Workers -> your Worker -> Settings -> Variables and Secrets.)
4. **MapTiler dashboard**: restrict the API key to your production domain(s) (the key is public by nature; domain allowlisting prevents abuse).
5. **Clerk dashboard**: configure the production instance and add the production domain to the allowed origins.
6. **First-time setup**: for local deploys run `pnpm exec wrangler login`; for Git CI, connect the repo to Workers Builds in Cloudflare. Confirm the `name` in `wrangler.jsonc` is the Worker name you want.
7. **Deploy**: run `pnpm run deploy` locally, or push to the connected branch to trigger Workers Builds.
8. **Optional**: bind a custom domain to the Worker in Cloudflare.

## Local verification (no deploy)

```bash
pnpm lint
pnpm build                            # validates client + workerd SSR bundles
pnpm exec wrangler deploy --dry-run   # packaging check only, no upload
```

