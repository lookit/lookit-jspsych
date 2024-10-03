import { LookitWindow } from "@lookit/data/dist/types";
import Handlebars from "handlebars";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import { version } from "../package.json";
import consentCopyTemplate from "../templates/consent-copy.hbs";
import consentVideoTrialTemplate from "../templates/consent-video-trial.hbs";
import {
  ButtonNotFoundError,
  ImageNotFoundError,
  VideoContainerNotFoundError,
} from "./errors";
import Recorder from "./recorder";
import { init } from "./utils";

declare const window: LookitWindow;

const info = <const>{
  name: "consent-video",
  version,
  parameters: {
    summary_statement: {
      type: ParameterType.STRING,
      default: "",
    },
    locale: {
      type: ParameterType.STRING,
      default: "en",
    },
    purpose_header: {
      type: ParameterType.STRING,
      default: "",
    },
    procedures: {
      type: ParameterType.STRING,
      default: "",
    },
    purpose: {
      type: ParameterType.STRING,
      default: "",
    },
    voluntary_participation: {
      type: ParameterType.STRING,
      default: "",
    },
    institution: {
      type: ParameterType.STRING,
      default: "",
    },
    risk_statement: {
      type: ParameterType.STRING,
      default: "",
    },
    risk_header: {
      type: ParameterType.STRING,
      default: "",
    },
    benefits_header: {
      type: ParameterType.STRING,
      default: "",
    },
    payment: {
      type: ParameterType.STRING,
      default: "",
    },
    prompt_only_adults: {
      type: ParameterType.BOOL,
      default: false,
    },
    private_level_only: {
      type: ParameterType.BOOL,
      default: false,
    },
    include_databrary: {
      type: ParameterType.BOOL,
      default: true,
    },
    additional_video_privacy_statement: {
      type: ParameterType.STRING,
      default: "",
    },
    datause: {
      type: ParameterType.STRING,
      default: "",
    },
    additional_segments: {
      type: ParameterType.OBJECT,
      default: {},
    },
    research_rights_statement: {
      type: ParameterType.STRING,
      default: "",
    },
    gdpr: {
      type: ParameterType.BOOL,
      default: false,
    },
    gdpr_personal_data: {
      type: ParameterType.STRING,
      default: "",
    },
    gdpr_sensitive_data: {
      type: ParameterType.STRING,
      default: "",
    },
    PIName: {
      type: ParameterType.STRING,
      default: "",
    },
    PIContact: {
      type: ParameterType.STRING,
      default: "",
    },
    omit_injury_phrase: {
      type: ParameterType.BOOL,
      default: false,
    },
  },
};
type Info = typeof info;

/** The video consent plugin. */
export class VideoConsentPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private readonly recorder: Recorder;
  private readonly video_container_id = "lookit-jspsych-video-container";

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
    const { video_container_id } = this;
    const experiment = window.chs.study.attributes;

    // Initialize both i18next and Handlebars
    init(trial);

    // Render left side (consent text)
    const renderConsent = Handlebars.compile(consentCopyTemplate);
    const consent = renderConsent({
      name: trial.PIName,
      contact: trial.PIContact,
      institution: trial.institution,
      experiment,
    });

    // Render whole document with above consent text
    const renderConsentVideoTrial = Handlebars.compile(
      consentVideoTrialTemplate,
    );
    const consentVideoTrial = renderConsentVideoTrial({
      consent,
      video_container_id,
    });

    // Add rendered document to display HTML
    display.insertAdjacentHTML("afterbegin", consentVideoTrial);

    // Video recording HTML
    this.webcamFeed(display);
    this.recordButton(display);
    this.stopButton(display);
    this.playButton(display);
    this.nextButton(display);
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
      throw new VideoContainerNotFoundError();
    }

    return videoContainer;
  }

  /**
   * Add webcam feed to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private webcamFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    this.recorder.insertWebcamFeed(videoContainer);
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
      this.webcamFeed(display);
      next.disabled = false;
      play.disabled = false;
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
      throw new ButtonNotFoundError(id);
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
      record.disabled = true;
      stop.disabled = false;
      play.disabled = true;
      next.disabled = true;
      this.getImg(display, "record-icon").style.visibility = "visible";
      await this.recorder.start("consent");
    });
  }

  /**
   * Set up play button to playback last recorded video.
   *
   * @param display - HTML element for experiment.
   */
  private playButton(display: HTMLElement) {
    const play = this.getButton(display, "play");

    play.addEventListener("click", () => {
      play.disabled = true;
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
      play.disabled = false;
      await this.recorder.stop();
      this.recorder.reset();
      this.webcamFeed(display);
    });
  }
  /**
   * Add next button to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private nextButton(display: HTMLElement) {
    const next = this.getButton(display, "next");
    next.addEventListener("click", () => this.jsPsych.finishTrial());
  }
}

// type Objectx ={
//   type:string
// }

// interface ObjectA extends Objectx {
//   type: "A";
//   value1: string;
//   value2: number;
// };

// interface ObjectB extends Objectx {
//   type: "B";
//   valueA: string;
//   valueB: number;
// };

// type TypeA<I extends Objectx>
