import { ApiResponse, Child, PastSession } from "./types";
import { get } from "./utils";

async function retrieveChild(uuid: string) {
  return (await get<ApiResponse<Child>>(`children/${uuid}/`)).data;
}

async function retrievePastSessions(uuid: string) {
  return (await get<ApiResponse<PastSession[]>>(`past-sessions/${uuid}/`)).data;
}

export default { retrieveChild, retrievePastSessions };
