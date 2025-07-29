# @lookit/style

## 0.2.0

### Minor Changes

- 372f713: - Templates:
  - add message container to video consent template
  - add public `translateString` method for translating string directly
  - Record:
    - add translated status messages to the video consent plugin: not recording,
      starting, recording, stopping/uploading
    - wait to enable/disable certain buttons until recorder has fully
      started/stopped
    - refactor error messages to use a single ElementNotFound with ID/tag
      arguments
  - Style: add CSS for the video-consent plugin's message container

### Patch Changes

- 21f05bc: Fix the webcam feed layout jump in video-consent trials when
  recording stops.

## 0.1.0

### Minor Changes

- c28bd6c: Update to @jspsych/config v3 and various fixes to breaking changes

## 0.0.6

### Patch Changes

- 1a7d73e: Change the webcam display to mirror the participant.
- 1118fc7: Adds support for translation and an optional locale parameter to the
  VideoConfigPlugin and StopRecordPlugin in the record packages.

## 0.0.5

### Patch Changes

- ec2fdec: Update consent video style

## 0.0.4

### Patch Changes

- 9385555: Update consent trial style
- b111054: Update rollup config to hide known circular warnings
- 888be3d: Update to unpkg config

## 0.0.3

### Patch Changes

- 171a96c: Update to mkdocs config and python packages

## 0.0.2

### Patch Changes

- b729922: Add consent video trial
- 07ce665: Update code formatting
