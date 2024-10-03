import Handlebars from "handlebars";
import i18next from "i18next";
import ICU from "i18next-icu";
import Yaml from "js-yaml";
import { PluginInfo, TrialType } from "jspsych";
import en_us from "../i18n/en-us.yaml";

/**
 * Pulled from EFP. Function to convert researcher's text to HTML.
 *
 * @param text - Text
 * @returns Formatted string
 */
export const expFormat = (text?: string | string[]) => {
  if (!text) {
    return "";
  }

  if (Array.isArray(text)) {
    text = text.join("\n\n");
  }

  return text
    .replace(/(\r\n|\n|\r)/gm, "<br>")
    .replace(/\t/gm, "&nbsp;&nbsp;&nbsp;&nbsp;");
};

/**
 * Initialize i18next with parameters from trial.
 *
 * @param trial - Trial data including user supplied parameters.
 */
const initI18next = (trial: TrialType<PluginInfo>) => {
  const { locale } = trial;
  const translation = Yaml.load(en_us) as Record<string, string>;
  const a2Code = locale.split("-")[0];
  const debug = process.env.DEBUG === "true";

  i18next.use(ICU).init({
    lng: locale,
    debug,
    resources: {
      [a2Code]: {
        translation,
      },
    },
  });
};

/**
 * Initialize handlebars helpers. This could be done globally, but it does go
 * hand in hand with initializing i18n.
 */
const initHandlebars = () => {
  Handlebars.registerHelper("t", (context, { hash }) =>
    i18next.t(context, hash),
  );
  Handlebars.registerHelper("exp-format", (context) => expFormat(context));
};

/**
 * Initialize both i18next and Handlebars.
 *
 * @param trial - Yup
 */
export const init = (trial: TrialType<PluginInfo>) => {
  initI18next(trial);
  initHandlebars();
};
