# @lookit/record

## 1.0.0

### Patch Changes

- Updated dependencies [9605ac4]
  - @lookit/data@0.1.0
  - @lookit/templates@1.0.0

## 0.0.5

### Patch Changes

- 6c42a48: Generate environment file before production build
- 7230f51: Add missing default value for video consent "additional_segments"
  parameter, which was causing an error when this optional parameter was omitted
  (#84).
- Updated dependencies [6c42a48]
  - @lookit/templates@0.0.2
  - @lookit/data@0.0.5

## 0.0.4

### Patch Changes

- bb6754c: Move translations and video consent templates to new templates
  package.
- c879e6a: Add ability to select specific video consent template.
- 4e72f2b: Adds `chs_type: "consent"` to consentVideo trial data and updates the
  lookit-api response object with `completed_consent_frame: true` at the end of
  the consentVideo trial.
- b111054: Update rollup config to hide known circular warnings
- 2a3ce6d: Change video file names to match existing format, and to pass
  necessary info to AWS Lambda for saving video files to database.
- 496b62d: Unmute playback of recorded consent video.
- 9385555: Add Garden's consent template
- Updated dependencies [bb6754c]
- Updated dependencies [c879e6a]
- Updated dependencies [b111054]
- Updated dependencies [888be3d]
- Updated dependencies [9385555]
  - @lookit/templates@0.0.1
  - @lookit/data@0.0.4

## 0.0.3

### Patch Changes

- 171a96c: Update to mkdocs config and python packages
- 171a96c: Documentation for the video consent trial
- Updated dependencies [171a96c]
  - @lookit/data@0.0.3

## 0.0.2

### Patch Changes

- 07ce665: Replace MustacheJS with Handlebars
- b729922: Add consent video trial
- 506afd8: Added a few tests for coverage.
- 07ce665: Add remaining translations
- 07ce665: Update code formatting
- Updated dependencies [f2cd2a8]
- Updated dependencies [07ce665]
  - @lookit/data@0.0.2
