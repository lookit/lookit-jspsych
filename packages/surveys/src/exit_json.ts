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
          description:
            "We ask again just to check for typos during registration or accidental selection of a different child at the start of the study.",
          inputType: "date",
          isRequired: true,
          maxValueExpression: "today()",
          name: names.birthDate,
          title: "Please confirm your child's birthdate.",
          type: "text",
        },
        {
          description:
            "Only authorized researchers will have access to information in the library. Researchers who are granted access must agree to maintain confidentiality and not use information for commercial purposes. Data sharing will lead to faster progress in research on human development and behavior. If you have any questions about the data-sharing library, please visit [Databrary](https://nyu.databrary.org/) or email ethics@databrary.org.",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.databraryShare,
          title:
            "Would you like to share your video and other data from this session with authorized users of the secure data library Databrary?",
          type: "boolean",
          valueFalse: "no",
          valueTrue: "yes",
        },
        {
          choices: [
            {
              text: "**Private**: Video may only be viewed by authorized scientists",
              value: "private",
            },
            {
              text: "**Scientific and educational**: Video may be shared for scientific or educational purposes. For example, we might show a video clip in a talk at a scientific conference or an undergraduate class about cognitive development, or include an image or video in a scientific paper. In some circumstances, video or images may be available online, for instance as supplemental material in a scientific paper.",
              value: "scientific",
            },
            {
              text: "**Publicity**: Please select this option if you'd be excited about seeing your child featured on the Lookit website or in a news article about this study! Your video may be shared for publicity as well as scientific and educational purposes; it will never be used for commercial purposes. Video clips shared may be available online to the general public.",
              value: "public",
            },
          ],
          description: "",
          enableIf: "({withdrawal} empty) or ({withdrawal.length} = 0)",
          isRequired: true,
          name: names.useOfMedia,
          title: "Use of video clips and images:",
          type: "radiogroup",
        },
        {
          choices: [],
          defaultValue: [],
          isRequired: false,
          name: names.withdrawal,
          title: "Withdrawal of video data",
          type: "checkbox",
        },
        {
          autoGrow: true,
          name: names.feedback,
          rows: 3,
          title:
            "How did it go? Do you have any suggestions for improving the study?",
          type: "comment",
        },
      ],
      name: "page1",
    },
  ],
  showQuestionNumbers: "off",
};
