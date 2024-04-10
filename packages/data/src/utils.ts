import { ApiResponse } from "./types";

const CONFIG = <const>{ url_base: "/api/v2/" };

export async function jsonData<T>(request: Request) {
  const response = await fetch(request);
  const json = await (response.json() as Promise<ApiResponse<T>>);
  return json.data;
}

export function get<T>(url: string) {
  /**
   * Function for REST get.
   */

  const request = new Request(CONFIG.url_base + url, {
    method: "GET",
    mode: "same-origin",
  });

  return jsonData<T>(request);
}

export function patch<T, G>(url: string, data: T) {
  /**
   * Function for REST patch.
   */
  const request = new Request(CONFIG.url_base + url, {
    method: "PATCH",
    headers: {
      "X-CSRFToken": csrfToken(),
      "Content-Type": "application/vnd.api+json",
    },
    mode: "same-origin", // Do not send CSRF token to another domain.
    body: JSON.stringify({ data }),
  });

  return jsonData<G>(request);
}

export function csrfToken() {
  /**
   * Function to get csrf token from cookies.
   */
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1] ?? ""
  );
}

export function getUuids() {
  const locationHref = window.location.href;
  const uuids = locationHref.replace("preview/", "").split("/").slice(-3, -1);
  if (locationHref.includes("/exp/studies/j/") && uuids && uuids.length === 2) {
    return { study: uuids[0], child: uuids[1] };
  } else {
    throw new Error("URL is different than expected.");
  }
}
