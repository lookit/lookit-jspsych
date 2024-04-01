const CONFIG = <const>{ url_base: "/api/v2/" };

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
  const locationHref = window.location.href;
  const uuids = locationHref.replace("/preview/", "").split("/").slice(-2);
  if (locationHref.includes("/exp/studies/j/") && uuids && uuids.length === 2) {
    return { study: uuids[0], child: uuids[1] };
  } else {
    throw Error("URL is different than expected.");
  }
}
