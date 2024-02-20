import { ApiResponse, Child, PastSession } from "@lookit/lookit-api/dist/types";
import { enableFetchMocks } from "jest-fetch-mock";

import Helpers from "./index";

enableFetchMocks();

test("Show that helpers child method returns expected data", async () => {
  // Use date as given name to show that the data isn't manufactured.
  const child = { attributes: { given_name: new Date().toString() } } as Child;
  const data: ApiResponse<Child> = { data: child };

  fetchMock.mockOnce(JSON.stringify(data));

  const child_uuid = "child uuid";
  const response_uuid = "response uuid";
  const helpersChild = await new Helpers(child_uuid, response_uuid).child();
  expect({
    given_name: child.attributes.given_name,
    additional_information: child.attributes.additional_information,
    age_at_birth: child.attributes.age_at_birth,
    birthday: child.attributes.birthday,
  }).toStrictEqual(helpersChild);
});

test("Show that helpers past sessions returns expected data", async () => {
  // Use date as id to show that the data isn't manufactured.
  const pastSessions = [{ id: new Date().toString() }] as PastSession[];
  const data: ApiResponse<PastSession[]> = { data: pastSessions };

  fetchMock.mockOnce(JSON.stringify(data));

  const child_uuid = "child uuid";
  const response_uuid = "response uuid";
  const helpersPastSessions = await new Helpers(
    child_uuid,
    response_uuid,
  ).pastSessions();
  expect(pastSessions).toStrictEqual(helpersPastSessions);
});
