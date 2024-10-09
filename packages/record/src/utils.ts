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
import { TranslationNotFoundError } from "./errors";

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
 * Get a translation file based on selected language.
 *
 * @param lcl - Locale object with locale
 * @returns Translations from i18next
 */
export const getTranslation = (lcl: Intl.Locale) => {
  /**
   * Switch case to find language from a string. Will throw error is language
   * not found.
   *
   * @param baseName - Base name from locale (en-us)
   * @returns Language yaml file
   */
  const getYaml = (baseName: string) => {
    switch (baseName) {
      case "en-US":
        return en_us;
      case "eu":
        return eu;
      case "fr":
        return fr;
      case "hu":
        return hu;
      case "it":
        return it;
      case "ja":
        return ja;
      case "nl":
        return nl;
      case "pt-BR":
        return pt_br;
      case "pt":
        return pt;
      default:
        throw new TranslationNotFoundError(baseName);
    }
  };

  return Yaml.load(getYaml(lcl.baseName)) as Record<string, string>;
};

/**
 * Initialize i18next with parameters from trial.
 *
 * @param trial - Trial data including user supplied parameters.
 */
const initI18next = (trial: TrialType<PluginInfo>) => {
  const debug = process.env.DEBUG === "true";
  const lcl = new Intl.Locale(trial.locale);
  const translation = getTranslation(lcl);

  i18next.use(ICU).init({
    lng: lcl.baseName,
    debug,
    resources: {
      [lcl.language]: {
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
export const initI18nAndTemplates = (trial: TrialType<PluginInfo>) => {
  initI18next(trial);
  initHandlebars();
};
