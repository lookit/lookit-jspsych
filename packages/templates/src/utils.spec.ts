import Handlebars from "handlebars";
import i18next from "i18next";
import { PluginInfo, TrialType } from "jspsych";
import { LocaleNotFoundError } from "./errors";
import { expFormat, setLocale, translateString } from "./utils";

test("expFormat convert written text to format well in HTML", () => {
  expect(expFormat("abcdefg")).toStrictEqual("abcdefg");
  expect(expFormat("AAABBBCCC")).toStrictEqual("AAABBBCCC");
  expect(expFormat("A normal sentence with multiple words.")).toStrictEqual(
    "A normal sentence with multiple words.",
  );
  expect(expFormat(["Array", "of", "strings"])).toStrictEqual(
    "Array<br><br>of<br><br>strings",
  );
  expect(expFormat("carriage return an newline\r\n")).toStrictEqual(
    "carriage return an newline<br>",
  );
  expect(expFormat("new line\n")).toStrictEqual("new line<br>");
  expect(expFormat("carriage return\r")).toStrictEqual("carriage return<br>");
  expect(expFormat("\tTabbed text")).toStrictEqual(
    "&nbsp;&nbsp;&nbsp;&nbsp;Tabbed text",
  );
});

test("exp-format Handlebars helper returns SafeString and preserves HTML in template", () => {
  // Importing utils registers the helper as a side effect, so it is available here.
  const helper = Handlebars.helpers["exp-format"] as (
    context: string,
  ) => Handlebars.SafeString;
  expect(helper("text")).toBeInstanceOf(Handlebars.SafeString);

  // Compile a template using double-brace syntax. With SafeString, the <br> and
  // &nbsp; produced by expFormat are not further escaped by Handlebars.
  const template = Handlebars.compile("{{exp-format text}}");
  expect(template({ text: "line1\nline2" })).toBe("line1<br>line2");
  expect(template({ text: "\tindented" })).toBe(
    "&nbsp;&nbsp;&nbsp;&nbsp;indented",
  );

  // HTML tags in the input string are preserved.
  expect(template({ text: "<strong>bold</strong>" })).toBe(
    "<strong>bold</strong>",
  );
});

test("setLocale throw error with non-existing locale", () => {
  const trial = { locale: "non-existing" } as unknown as TrialType<PluginInfo>;
  expect(() => setLocale(trial)).toThrow(LocaleNotFoundError);
});

test("translateString translates the string with the appropriate locale", () => {
  const en = new Intl.Locale("en-us");
  i18next.changeLanguage(en.baseName);
  expect(translateString("Continue")).toBe("Continue");
  const fr = new Intl.Locale("fr");
  i18next.changeLanguage(fr.baseName);
  expect(translateString("Continue")).toBe("Continuer");
});
