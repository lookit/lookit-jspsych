import DOMPurify from "dompurify";
import { marked } from "marked";
import { Model } from "survey-jquery";

const CONFIG = <const>{
  marked: { async: false },
  dompurify: { USE_PROFILES: { html: true } },
};

export function survey_function(survey: Model) {
  survey.onTextMarkdown.add((_sender, options) => {
    // We can set the type as "string" because async is false.
    options.html = DOMPurify.sanitize(
      marked.parseInline(options.text, CONFIG.marked) as string,
      CONFIG.dompurify,
    );
  });
  return survey;
}
