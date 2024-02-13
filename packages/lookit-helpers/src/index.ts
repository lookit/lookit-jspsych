import api from "@lookit/lookit-api";

async function child(uuid: string) {
  const child = await api.retrieveChild(uuid);
  const { given_name, birthday, age_at_birth, additional_information } =
    child.attributes;
  return { given_name, birthday, age_at_birth, additional_information };
}

async function pastSessions(response_uuid: string) {
  return await api.retrievePastSessions(response_uuid);
}

export default { child, pastSessions };
