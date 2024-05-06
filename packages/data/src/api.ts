import {
  Child,
  PastSession,
  Promises,
  Response,
  ResponseAttrsUpdate,
  ResponseUpdate,
  Study,
} from "./types";
import { get, getUuids, patch } from "./utils";

const CONFIG = <const>{ ...getUuids() };
const promises: Promises[] = [];

function deposit<T extends Promises>(promise: T) {
  promises.push(promise);
  return promise;
}

export function finish() {
  return Promise.all(promises);
}

export function retrieveChild() {
  return deposit(get<Child>(`children/${CONFIG.child}/`));
}

export function retrievePastSessions(uuid: string) {
  return deposit(get<PastSession[]>(`past-sessions/${uuid}/`));
}

export function retrieveStudy() {
  return deposit(get<Study>(`studies/${CONFIG.study}/`));
}

export function retrieveResponse(uuid: string) {
  return deposit(get<Response>(`responses/${uuid}/`));
}

export function updateResponse(uuid: string, data: ResponseAttrsUpdate) {
  return deposit(
    patch<ResponseUpdate, Response>(`responses/${uuid}/`, {
      id: uuid,
      type: "responses",
      attributes: data,
    }),
  );
}
