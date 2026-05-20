---
"@lookit/templates": patch
"@lookit/record": patch
---

This update fixes a bug where string parameters could not include HTML or
markdown-style formatting/characters that should have been converted into HTML.
This also standardizes the use of ParameterType.HTML_STRING (rather than STRING)
anytime a parameter is rendered with unescaped HTML, and the use of double (vs
triple) braces with exp-format text. It adds tests for the exp-format template
tag to test the handlebars-rendered version of text, rather than just the output
of the helper function.
