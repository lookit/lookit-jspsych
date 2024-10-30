export const names = <const>{
  birthDate: "birthDate",
  databraryShare: "databraryShare",
  useOfMedia: "useOfMedia",
  withdrawal: "withdrawal",
  feedback: "feedback",
};

export const surveyJSON = {
  pages: [
    {
      elements: [
        {
          description: "exp-lookit-exit-survey.why-birthdate",
          inputType: "date",
          isRequired: true,
          maxValueExpression: "today()",
          name: names.birthDate,
          title: "exp-lookit-exit-survey.confirm-birthdate",
          type: "text",
        },
        {
          description: "exp-lookit-exit-survey.databrary-info",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.databraryShare,
          title: "exp-lookit-exit-survey.q-databrary",
          type: "boolean",
          valueFalse: "no",
          valueTrue: "yes",
        },
        {
          choices: [
            {
              text: "exp-lookit-exit-survey.private-option-part-1",
              value: "private",
            },
            {
              text: "exp-lookit-exit-survey.scientific-option",
              value: "scientific",
            },
            {
              text: "exp-lookit-exit-survey.publicity-option",
              value: "public",
            },
          ],
          description: "",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.useOfMedia,
          title: "exp-lookit-exit-survey.acceptable-use-header",
          type: "radiogroup",
        },
        {
          choices: [
            { text: "exp-lookit-exit-survey.withdrawal-details", value: true },
          ],
          defaultValue: [],
          isRequired: false,
          name: names.withdrawal,
          title: "exp-lookit-exit-survey.withdrawal-header",
          type: "checkbox",
        },
        {
          autoGrow: true,
          name: names.feedback,
          rows: 3,
          title: "exp-lookit-exit-survey.feedback-label",
          type: "comment",
        },
      ],
      name: "page1",
    },
  ],
  showQuestionNumbers: "off",
};
