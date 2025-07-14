import Data from "@lookit/data";
import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { version } from "../package.json";
import { ElementNotFoundError, ImageNotFoundError } from "./errors";
import Recorder from "./recorder";

declare const window: LookitWindow;

const info = <const>{
  name: "consent-video",
  version,
  parameters: {
    template: { type: ParameterType.STRING, default: "consent-template-5" },
    locale: { type: ParameterType.STRING, default: "en-us" },
    additional_video_privacy_statement: {
      type: ParameterType.STRING,
      default: "",
    },
    datause: { type: ParameterType.STRING, default: "" },
    gdpr: { type: ParameterType.BOOL, default: false },
    gdpr_personal_data: { type: ParameterType.STRING, default: "" },
    gdpr_sensitive_data: { type: ParameterType.STRING, default: "" },
    PIName: { type: ParameterType.STRING, default: undefined },
    include_databrary: { type: ParameterType.BOOL, default: false },
    institution: { type: ParameterType.STRING, default: undefined },
    PIContact: { type: ParameterType.STRING, default: undefined },
    payment: { type: ParameterType.STRING, default: undefined },
    private_level_only: { type: ParameterType.BOOL, default: false },
    procedures: { type: ParameterType.STRING, default: undefined },
    purpose: { type: ParameterType.STRING, default: undefined },
    research_rights_statement: { type: ParameterType.STRING, default: "" },
    risk_statement: { type: ParameterType.STRING, default: "" },
    voluntary_participation: { type: ParameterType.STRING, default: "" },
    purpose_header: { type: ParameterType.STRING, default: "" },
    procedures_header: { type: ParameterType.STRING, default: "" },
    participation_header: { type: ParameterType.STRING, default: "" },
    benefits_header: { type: ParameterType.STRING, default: "" },
    risk_header: { type: ParameterType.STRING, default: "" },
    summary_statement: { type: ParameterType.STRING, default: "" },
    additional_segments: {
      type: ParameterType.COMPLEX,
      array: true,
      default: [],
      nested: {
        title: {
          type: ParameterType.STRING,
          default: "",
        },
        text: {
          type: ParameterType.STRING,
          default: "",
        },
      },
    },
    prompt_all_adults: { type: ParameterType.BOOL, default: false },
    prompt_only_adults: { type: ParameterType.BOOL, default: false },
    consent_statement_text: { type: ParameterType.STRING, default: "" },
    omit_injury_phrase: { type: ParameterType.BOOL, default: false },
  },
};
type Info = typeof info;

/** The video consent plugin. */
export class VideoConsentPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private readonly recorder: Recorder;
  private readonly video_container_id = "lookit-jspsych-video-container";
  private readonly msg_container_id = "lookit-jspsych-video-msg-container";
  private uploadingMsg: string | null = null;
  private startingMsg: string | null = null;
  private recordingMsg: string | null = null;
  private notRecordingMsg: string | null = null;

  /**
   * Instantiate video consent plugin.
   *
   * @param jsPsych - JsPsych object
   */
  public constructor(private readonly jsPsych: JsPsych) {
    this.jsPsych = jsPsych;
    this.recorder = new Recorder(this.jsPsych);
  }

  /**
   * Create/Show trial view.
   *
   * @param display - HTML element for experiment.
   * @param trial - Trial data including user supplied parameters.
   */
  public trial(display: HTMLElement, trial: TrialType<Info>) {
    // Get trial HTML string from templates package. This will also set the i18n locale.
    const consentVideo = chsTemplates.consentVideo(trial);

    // Add rendered document to display HTML
    display.insertAdjacentHTML("afterbegin", consentVideo);

    // Video recording HTML
    this.recordFeed(display);
    // Set event listeners for buttons.
    this.recordButton(display);
    this.stopButton(display);
    this.playButton(display);
    this.nextButton(display);
    // Translate and store any messages that may need to be shown. Locale has already been set via the chsTemplates consentVideo method.
    this.uploadingMsg = chsTemplates.translateString(
      "exp-lookit-video-consent.Stopping-and-uploading",
    );
    this.startingMsg = chsTemplates.translateString(
      "exp-lookit-video-consent.Starting-recorder",
    );
    this.recordingMsg = chsTemplates.translateString(
      "exp-lookit-video-consent.Recording",
    );
    this.notRecordingMsg = chsTemplates.translateString(
      "exp-lookit-video-consent.Not-recording",
    );
  }

  /**
   * Retrieve video container element.
   *
   * @param display - HTML element for experiment.
   * @returns Video container
   */
  private getVideoContainer(display: HTMLElement) {
    const videoContainer = display.querySelector<HTMLDivElement>(
      `div#${this.video_container_id}`,
    );

    if (!videoContainer) {
      throw new ElementNotFoundError(this.video_container_id);
    }

    return videoContainer;
  }

  /**
   * Add webcam feed to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private recordFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    this.recorder.insertRecordFeed(videoContainer);
    this.getImg(display, "record-icon").style.visibility = "hidden";
  }

  /**
   * Playback Feed
   *
   * @param display - JsPsych display HTML element.
   */
  private playbackFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    this.recorder.insertPlaybackFeed(videoContainer, this.onEnded(display));
  }

  /**
   * Get message container that appears alongside the video element.
   *
   * @param display - HTML element for experiment.
   * @returns Message container div element.
   */
  private getMessageContainer(display: HTMLElement) {
    const msgContainer = display.querySelector<HTMLDivElement>(
      `div#${this.msg_container_id}`,
    );

    if (!msgContainer) {
      throw new ElementNotFoundError(this.msg_container_id);
    }

    return msgContainer;
  }

  /**
   * Add HTML-formatted message alongside the video feed, e.g. for waiting
   * periods during webcam feed transitions (starting, stopping/uploading). This
   * will also replace an existing message with the new one. To clear any
   * existing messages, pass an empty string.
   *
   * @param display - HTML element for experiment.
   * @param message - HTML content for message div.
   */
  private addMessage(display: HTMLElement, message: string) {
    const msgContainer = this.getMessageContainer(display);
    msgContainer.innerHTML = message;
  }

  /**
   * Put back the webcam feed once the video recording has ended. This is used
   * with the "ended" Event.
   *
   * @param display - JsPsych display HTML element.
   * @returns Event function
   */
  private onEnded(display: HTMLElement) {
    return () => {
      const next = this.getButton(display, "next");
      const play = this.getButton(display, "play");
      const record = this.getButton(display, "record");

      this.recordFeed(display);
      this.addMessage(display, this.notRecordingMsg!);
      next.disabled = false;
      play.disabled = false;
      record.disabled = false;
    };
  }

  /**
   * Retrieve button element from DOM.
   *
   * @param display - HTML element for experiment.
   * @param id - Element id
   * @returns Button element
   */
  private getButton(
    display: HTMLElement,
    id: "play" | "next" | "stop" | "record",
  ) {
    const btn = display.querySelector<HTMLButtonElement>(`button#${id}`);
    if (!btn) {
      throw new ElementNotFoundError(id);
    }
    return btn;
  }

  /**
   * Select and return the image element.
   *
   * @param display - HTML element for experiment.
   * @param id - ID string of Image element
   * @returns Image Element
   */
  private getImg(display: HTMLElement, id: "record-icon") {
    const img = display.querySelector<HTMLImageElement>(`img#${id}`);

    if (!img) {
      throw new ImageNotFoundError(id);
    }

    return img;
  }

  /**
   * Add record button to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private recordButton(display: HTMLElement) {
    const record = this.getButton(display, "record");
    const stop = this.getButton(display, "stop");
    const play = this.getButton(display, "play");
    const next = this.getButton(display, "next");

    record.addEventListener("click", async () => {
      this.addMessage(display, this.startingMsg!);
      record.disabled = true;
      stop.disabled = false;
      play.disabled = true;
      next.disabled = true;
      this.getImg(display, "record-icon").style.visibility = "visible";
      await this.recorder.start(true, VideoConsentPlugin.info.name);
      this.addMessage(display, this.recordingMsg!);
    });
  }

  /**
   * Set up play button to playback last recorded video.
   *
   * @param display - HTML element for experiment.
   */
  private playButton(display: HTMLElement) {
    const play = this.getButton(display, "play");
    const record = this.getButton(display, "record");

    play.addEventListener("click", () => {
      play.disabled = true;
      record.disabled = true;
      this.playbackFeed(display);
    });
  }

  /**
   * Add stop button to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private stopButton(display: HTMLElement) {
    const stop = this.getButton(display, "stop");
    const record = this.getButton(display, "record");
    const play = this.getButton(display, "play");

    stop.addEventListener("click", async () => {
      stop.disabled = true;
      record.disabled = false;
      this.addMessage(display, this.uploadingMsg!);
      await this.recorder.stop();
      play.disabled = false;
      this.recorder.reset();
      this.recordFeed(display);
      this.getImg(display, "record-icon").style.visibility = "hidden";
      this.addMessage(display, this.notRecordingMsg!);
    });
  }
  /**
   * Add next button to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private nextButton(display: HTMLElement) {
    const next = this.getButton(display, "next");
    next.addEventListener("click", () => this.endTrial());
  }

  /**
   * Mark the response in the lookit-api database as having completed the
   * consent frame, then finish the trial.
   */
  private async endTrial() {
    await Data.updateResponse(window.chs.response.id, {
      completed_consent_frame: true,
    });
    this.jsPsych.finishTrial();
  }

  /**
   * Add CHS type to experiment data. This will enable Lookit API to run the
   * "consent" Frame Action Dispatcher method after the experiment has
   * completed.
   *
   * @returns Object containing CHS type.
   */
  public static chsData() {
    return { chs_type: "consent" };
  }
}
