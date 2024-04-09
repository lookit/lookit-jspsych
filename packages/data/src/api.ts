import {
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
  return await get<Child>(`children/${CONFIG.child}/`);
}

export async function retrievePastSessions(uuid: string) {
  return await get<PastSession[]>(`past-sessions/${uuid}/`);
}

export async function retrieveStudy() {
  return await get<Study>(`studies/${CONFIG.study}/`);
}

export async function retrieveResponse(uuid: string) {
  return await get<Response>(`responses/${uuid}/`);
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
