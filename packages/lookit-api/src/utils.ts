const url_base = "/api/v2/";

export async function get<T>(url: string) {
  /**
   * Function for REST get.
   */

  const request = new Request(url_base + url, {
    method: "GET",
    mode: "same-origin",
  });

  const response = await fetch(request);
  return response.json() as Promise<T>;
}
