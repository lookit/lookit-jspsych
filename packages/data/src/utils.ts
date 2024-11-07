import { URLWrongError } from "./errors";
import { ApiResponse } from "./types";

const CONFIG = <const>{ url_base: "/api/v2/" };

/**
 * Get JSON data from a Request.
 *
 * @param request - Request returned by call to API.
 * @returns Data from API call.
 */
export const jsonData = async <T>(request: Request) => {
  const response = await fetch(request);
  const json = await (response.json() as Promise<ApiResponse<T>>);
  return json.data;
};

/**
 * Function for REST get.
 *
 * @param url - URL to get.
 * @returns JSON data from API call.
 */
export const get = <T>(url: string) => {
  const request = new Request(CONFIG.url_base + url, {
    method: "GET",
    mode: "same-origin",
  });

  return jsonData<T>(request);
};

/**
 * Function for REST patch.
 *
 * @param url - URL to patch.
 * @param data - JSON data from API call.
 * @returns JSON data from API call.
 */
export const patch = <T, G>(url: string, data: T) => {
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
};

/**
 * Function to get csrf token from cookies.
 *
 * @returns CSRF token.
 */
export const csrfToken = () => {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1] ?? ""
  );
};

/**
 * Wrapper for location.href. This is mainly to make testing easier.
 *
 * @returns Href
 */
export const getLocationHref = () => window.location.href;

/**
 * Get Study and Child UUID from URL.
 *
 * @returns Object containing UUIDs.
 */
export const getUuids = () => {
  const locationHref = getLocationHref();
  const uuids = locationHref.replace("preview/", "").split("/").slice(-3, -1);
  if (locationHref.includes("studies/j/") && uuids && uuids.length === 2) {
    return { study: uuids[0], child: uuids[1] };
  } else {
    throw new URLWrongError();
  }
};
