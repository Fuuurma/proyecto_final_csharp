import { Link } from "@tanstack/react-router";
import { useSelection } from "@/lib/selection";

export function SiteHeader() {
  const { items, isHydrated } = useSelection();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="wordmark" aria-label="Meet the Met home">
          <span>Meet</span>
          <span className="wordmark__sub">the Met</span>
        </Link>

        <nav className="site-nav" aria-label="Primary navigation">
          <Link
            to="/explore"
            className="site-nav__link"
            activeProps={{
              className: "site-nav__link is-active",
              "aria-current": "page",
            }}
          >
            Explore
          </Link>
          <Link
            to="/departments"
            className="site-nav__link"
            activeProps={{
              className: "site-nav__link is-active",
              "aria-current": "page",
            }}
          >
            Departments
          </Link>
          <Link
            to="/selection"
            className="site-nav__link site-nav__link--selection"
            activeProps={{
              className: "site-nav__link site-nav__link--selection is-active",
              "aria-current": "page",
            }}
          >
            <span>Selection</span>
            {isHydrated && items.length > 0 ? (
              <span className="site-nav__badge mono">{items.length}</span>
            ) : null}
          </Link>
          <Link
            to="/about"
            className="site-nav__link"
            activeProps={{
              className: "site-nav__link is-active",
              "aria-current": "page",
            }}
          >
            About
          </Link>
        </nav>

        <p className="site-header__note">An independent lens on open access</p>
      </div>
    </header>
  );
}
