import { ApiResponse, Child, PastSession, Study } from "./types";
import { get, getUuids } from "./utils";

const CONFIG = <const>{ ...getUuids() };

async function retrieveChild() {
  return (await get<ApiResponse<Child>>(`children/${CONFIG.child}/`)).data;
}

async function retrievePastSessions(uuid: string) {
  return (await get<ApiResponse<PastSession[]>>(`past-sessions/${uuid}/`)).data;
}

async function retreiveStudy() {
  return (await get<ApiResponse<Study>>(`studies/${CONFIG.study}/`)).data;
}

export default { retrieveChild, retrievePastSessions, retreiveStudy };
