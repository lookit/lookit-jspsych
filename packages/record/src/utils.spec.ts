import { expFormat } from "./utils";

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
