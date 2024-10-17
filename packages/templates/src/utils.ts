import Handlebars from "handlebars";
import i18next from "i18next";
import ICU from "i18next-icu";
import Yaml from "js-yaml";
import { PluginInfo, TrialType } from "jspsych";
import en_us from "../i18n/en-us.yaml";
import eu from "../i18n/eu.yaml";
import fr from "../i18n/fr.yaml";
import hu from "../i18n/hu.yaml";
import it from "../i18n/it.yaml";
import ja from "../i18n/ja.yaml";
import nl from "../i18n/nl.yaml";
import pt_br from "../i18n/pt-br.yaml";
import pt from "../i18n/pt.yaml";
import { LocaleNotFoundError } from "./errors";

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
 * Get a translation resources from yaml files.
 *
 * @returns Resources for i18next
 */
const resources = () => {
  const translations = {
    "en-us": en_us,
    eu,
    fr,
    hu,
    it,
    ja,
    nl,
    "pt-br": pt_br,
    pt,
  };

  return Object.entries(translations).reduce((prev, [locale, translation]) => {
    const lcl = new Intl.Locale(locale);
    return {
      ...prev,
      [lcl.baseName]: {
        translation: Yaml.load(translation) as Record<string, string>,
      },
    };
  }, {});
};

/**
 * Initialize i18next with parameters from trial.
 *
 * @param trial - Trial data including user supplied parameters.
 */
export const setLocale = (trial: TrialType<PluginInfo>) => {
  try {
    const lcl = new Intl.Locale(trial.locale);
    if (i18next.language !== lcl.baseName) {
      i18next.changeLanguage(lcl.baseName);
    }
  } catch (error) {
    if (error instanceof RangeError) {
      throw new LocaleNotFoundError(trial.locale);
    } else {
      throw error;
    }
  }
};

// Initialize translations
i18next.use(ICU).init({
  debug: process.env.DEBUG === "true",
  resources: resources(),
});

// Setup Handlebars' helpers
Handlebars.registerHelper("exp-format", (context) => expFormat(context));
Handlebars.registerHelper("t", (context, { hash }) => i18next.t(context, hash));
