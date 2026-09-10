/** Choose the most specific route, including reviewer query tabs. */
export function activeNavHref(
  items: readonly (readonly [string, string, string])[],
  pathname: string,
  query: URLSearchParams,
) {
  return items
    .map(([, href]) => href)
    .filter((href) => {
      const [path, search] = href.split("?");
      if (path !== pathname && !pathname.startsWith(`${path}/`)) return false;
      if (search)
        return path === pathname && [...new URLSearchParams(search)].every(([key, value]) => query.get(key) === value);
      return true;
    })
    .sort((a, b) => b.length - a.length)[0];
}
