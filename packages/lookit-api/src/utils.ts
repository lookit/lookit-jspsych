const CONFIG = <const>{url_base : "/api/v2/"};

export async function get<T>(url: string) {
  /**
   * Function for REST get.
   */

  const request = new Request(CONFIG.url_base + url, {
    method: "GET",
    mode: "same-origin",
  });

  const response = await fetch(request);
  return response.json() as Promise<T>;
}

export function getUuids() {
  const location = window.location.href;
  const regexp =
    /([0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})/i;
  const matches = regexp.exec(location);

  if (location.includes("exp/studies/j/") && matches && matches.length === 2) {
    return { study: matches[0], child: matches[1] };
  } else {
    throw Error("URL is different than expected.");
  }
}
