import api from "@lookit/lookit-api";

class Helpers {
  child_uuid: string;
  response_uuid: string;

  constructor(child_uuid: string, response_uuid: string) {
    this.child_uuid = child_uuid;
    this.response_uuid = response_uuid;
  }

  async child() {
    const child = await api.retrieveChild(this.child_uuid);
    const { given_name, birthday, age_at_birth, additional_information } =
      child.attributes;
    return { given_name, birthday, age_at_birth, additional_information };
  }

  async pastSessions() {
    return await api.retrievePastSessions(this.response_uuid);
  }
}

export default Helpers;
