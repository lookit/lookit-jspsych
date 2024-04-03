import {
  ApiResponse,
  Child,
  PastSession,
  Response,
  ResponseAttrsUpdate,
  ResponseUpdate,
  Study,
} from "./types";
import { get, getUuids, patch } from "./utils";

const CONFIG = <const>{ ...getUuids() };

export async function retrieveChild() {
  return (await get<ApiResponse<Child>>(`children/${CONFIG.child}/`)).data;
}

export async function retrievePastSessions(uuid: string) {
  return (await get<ApiResponse<PastSession[]>>(`past-sessions/${uuid}/`)).data;
}

export async function retreiveStudy() {
  return (await get<ApiResponse<Study>>(`studies/${CONFIG.study}/`)).data;
}

export async function retreiveResponse(uuid: string) {
  return (await get<ApiResponse<Response>>(`responses/${uuid}/`)).data;
}

export async function updateResponse(
  uuid: string,
  data: ResponseAttrsUpdate,
  controller?: AbortController,
) {
  return await patch<ResponseUpdate, Response>(
    `responses/${uuid}/`,
    {
      id: uuid,
      type: "responses",
      attributes: data,
    },
    controller,
  );
}
