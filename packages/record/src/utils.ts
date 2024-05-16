/**
 * Function to create a video recording filename.
 *
 * @param prefix - (string): Start of the file name for the video recording.
 * @returns Filename string, including the prefix, date/time and webm extension.
 */
export const getFilename = (prefix: string) => {
  return `${prefix}_${new Date().getTime()}.webm`;
};
