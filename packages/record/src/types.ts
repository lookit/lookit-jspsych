/**
 * A valid CSS height/width value, which can be a number, a string containing a
 * number with units, or 'auto'.
 */
export type CSSWidthHeight =
  | number
  | `${number}${"px" | "cm" | "mm" | "em" | "%"}`
  | "auto";