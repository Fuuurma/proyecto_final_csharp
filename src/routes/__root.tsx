import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { footerCues } from "@/lib/footer-cues";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/newsreader";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import { ArrowUpRightIcon } from "@/components/icons";
import { SelectionTray } from "@/components/selection-tray";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { SelectionProvider } from "@/lib/selection";
import { cn } from "@/lib/utils";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Meet the Met - The contemporary collection ledger" },
      {
        name: "description",
        content:
          "An independent, image-led explorer for The Metropolitan Museum of Art Open Access collection.",
      },
      { name: "theme-color", content: "#f3f1eb" },
      { property: "og:site_name", content: "Meet the Met" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "Meet the Met — The contemporary collection ledger",
      },
      {
        property: "og:description",
        content:
          "An independent, image-led explorer for The Metropolitan Museum of Art Open Access collection.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Warm the Met image origin before the first artwork paint
      // (devin 09-09 19:37 #9).
      {
        rel: "preconnect",
        href: "https://images.metmuseum.org",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://images.metmuseum.org" },
    ],
  }),
  notFoundComponent: RootNotFound,
  errorComponent: RouteError,
  component: RootLayout,
  shellComponent: RootDocument,
});

function RootNotFound() {
  return (
    <main className="page-frame not-found" aria-labelledby="not-found-heading">
      <span className="eyebrow">404 / Outside the register</span>
      <h1 id="not-found-heading">This room is not in the ledger.</h1>
      <p className="not-found__message">
        The route you requested could not be located in this index. You can
        explore all catalogued works or return to the collection ledger.
      </p>
      <div className="hero__actions">
        <Link
          to="/explore"
          className={cn(buttonVariants({ size: "lg" }), "hero-primary-link")}
        >
          Explore the collection <ArrowUpRightIcon />
        </Link>
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "record-link",
          )}
        >
          Return home
        </Link>
      </div>
    </main>
  );
}

function RouteError({ error }: { error: Error }) {
  return (
    <main
      className="page-frame not-found"
      aria-labelledby="route-error-heading"
    >
      <span className="eyebrow">Unexpected / The ledger slipped</span>
      <h1 id="route-error-heading">Something went wrong opening this page.</h1>
      <p className="not-found__message">
        An unexpected error occurred while rendering this route. You can try the
        collection index again or return to the home page.
      </p>
      {import.meta.env.DEV && error.message ? (
        <p className="mono route-error__detail">{error.message}</p>
      ) : null}
      <div className="hero__actions">
        <Link
          to="/explore"
          className={cn(buttonVariants({ size: "lg" }), "hero-primary-link")}
        >
          Explore the collection <ArrowUpRightIcon />
        </Link>
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "record-link",
          )}
        >
          Return home
        </Link>
      </div>
    </main>
  );
}

function RootLayout() {
  const { pathname } = useLocation();
  const cues = footerCues(pathname);
  return (
    <SelectionProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <div id="main-content">
        <Outlet />
      </div>
      <SelectionTray />
      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>Meet the Met / 2026</span>
          <nav className="site-footer__nav" aria-label="Footer">
            <Link to="/explore">Explore</Link>
            <Link to="/departments">Departments</Link>
            <Link to="/selection">Selection</Link>
            <Link to="/about">About</Link>
          </nav>
          <span>Not affiliated with The Metropolitan Museum of Art.</span>
          <a
            href="https://www.metmuseum.org/art/collection"
            target="_blank"
            rel="noreferrer"
          >
            Collection source <span aria-hidden="true">↗</span>
          </a>
        </div>
        {cues.length > 0 ? (
          <section
            className="site-footer__cues"
            aria-label="Keyboard shortcuts"
          >
            <span className="eyebrow">Ledger shortcuts</span>
            <ul className="cue-list">
              {cues.map((cue) => (
                <li key={cue.label}>
                  {cue.keys.map((key) => (
                    <kbd key={key} className="cue-key">
                      {key}
                    </kbd>
                  ))}
                  <span>{cue.label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </footer>
    </SelectionProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
