import { enableFetchMocks } from "jest-fetch-mock";

import { retrieveChild, retrievePastSessions } from "./api";
import { ApiResponse, Child, PastSession } from "./types";

enableFetchMocks();

test("Show that retrieveChild is responding with expected data", async () => {
  // Use date as id to show that the data isn't manufactured.
  const child = { id: new Date().toString() } as Child;
  const data: ApiResponse<Child> = { data: child };

  fetchMock.mockOnce(JSON.stringify(data));

  const retrieveChildData = await retrieveChild();
  expect(child).toStrictEqual(retrieveChildData);
});

test("Show that retrievePastSessions is responding with expected data", async () => {
  // Use date as id to show that the data isn't manufactured.
  const pastSessions: PastSession[] = [
    { id: new Date().toString() } as PastSession,
  ];
  const data: ApiResponse<PastSession[]> = { data: pastSessions };

  fetchMock.mockOnce(JSON.stringify(data));

  const retrievePastSessionsData = await retrievePastSessions("some uuid");
  expect(pastSessions).toStrictEqual(retrievePastSessionsData);
});
