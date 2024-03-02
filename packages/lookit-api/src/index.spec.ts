import { enableFetchMocks } from "jest-fetch-mock";

import api from "./index";
import { ApiResponse, Child, PastSession } from "./types";

enableFetchMocks();

test("Show that retrieveChild is responding with expected data", async () => {
  // Use date as id to show that the data isn't manufactured.
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };

  fetchMock.mockOnce(JSON.stringify(data));

  const retrieveChild = await api.retrieveChild("some uuid");
  expect(child).toStrictEqual(retrieveChild);
});

test("Show that retrievePastSessions is responding with expected data", async () => {
  // Use date as id to show that the data isn't manufactured.
  const pastSessions: PastSession[] = [
    { id: new Date().toString() } as PastSession,
  ];
  const data: ApiResponse<PastSession[]> = { data: pastSessions };

  fetchMock.mockOnce(JSON.stringify(data));

  const retrievePastSessions = await api.retrievePastSessions("some uuid");
  expect(pastSessions).toStrictEqual(retrievePastSessions);
});
