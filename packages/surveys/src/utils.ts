import DOMPurify from "dompurify";
import { marked } from "marked";
import { Model } from "survey-jquery";

const CONFIG = <const>{
  MARKED: { async: false },
  DOMPURIFY: { USE_PROFILES: { html: true } },
};

export function survey_function(survey: Model) {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set te type as "string" because async is false above.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text, CONFIG.MARKED) as string,
      CONFIG.DOMPURIFY,
    );
  });
  return survey;
}
