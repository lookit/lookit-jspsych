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

export function exit_survey_function(survey: Model) {
  survey_function(survey);
  // For the withdrawal checkbox question, this takes the boolean response value out of an array
  // and saves it as a single value (since there is always only one checkbox).
  // We went with the checkbox question type rather than boolean with "renderAs: checkbox" because the
  // latter doesn't allow both a question title and label next to the checkbox.
  survey.onComplete.add(function (sender) {
    const trueFalseValue =
      sender.getQuestionByName("withdrawal").value.length > 0;
    sender.setValue("withdrawal", trueFalseValue);
  });
}
