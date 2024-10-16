import Handlebars from "handlebars";
import consentDocumentTemplate from "../hbs/consent-document.hbs";

/**
 * Translate, render, and get consent document HTML.
 *
 * @returns Consent document HTML
 */
const consentDocument = () => {
  const view = {};
  return Handlebars.compile(consentDocumentTemplate)(view);
};

export default { consentDocument };
