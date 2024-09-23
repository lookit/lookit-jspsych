import { JsPsych, JsPsychPlugin } from "jspsych";
import Mustache from "mustache";
import { version } from "../package.json";
import consentVideo from "../templates/consent-video-trial.mustache";
import {
  ButtonNotFoundError,
  ImageNotFoundError,
  VideoContainerNotFoundError,
} from "./errors";
import Recorder from "./recorder";

const info = <const>{
  name: "consent-video",
  version,
  parameters: {},
  data: {},
};
type Info = typeof info;

/** The video consent plugin. */
export class ConsentVideoPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private recorder: Recorder;

  // Template variables
  private video_container_id = "lookit-jspsych-video-container";

  /**
   * Instantiate video consent plugin.
   *
   * @param jsPsych - JsPsych object
   */
  public constructor(private jsPsych: JsPsych) {
    this.jsPsych = jsPsych;
    this.recorder = new Recorder(this.jsPsych);
  }

  /**
   * Create/Show trial view.
   *
   * @param display - HTML element for experiment.
   */
  public trial(display: HTMLElement) {
    const { video_container_id } = this;

    display.insertAdjacentHTML(
      "afterbegin",
      Mustache.render(consentVideo, { video_container_id }),
    );

    // Set up trial HTML
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
    this.recorder.insertWebcamFeed(videoContainer, "300px");
  }

  /**
   * Playback Feed
   *
   * @param display - JsPsych display HTML element.
   */
  private playbackFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    this.recorder.insertPlaybackFeed(
      videoContainer,
      this.onEnded(display),
      "300px",
    );
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
      next.disabled = false;
      this.webcamFeed(display);
    };
  }

  /**
   * Retrieve button element from DOM.
   *
   * @param display - HTML element for experiment.
   * @param id - Element id
   * @returns Button element
   */
  private getButton(display: HTMLElement, id: string) {
    const btn = display.querySelector<HTMLButtonElement>(`button#${id}`);
    if (!btn) {
      throw new ButtonNotFoundError(id);
    }
    return btn;
  }

  /**
   * Select and return the SVG element.
   *
   * @param display - HTML element for experiment.
   * @param id - ID string of SVG element
   * @returns SVG Image Element
   */
  private getSVG(display: HTMLElement, id: string) {
    const svg = display.querySelector<SVGImageElement>("svg#record-icon");

    if (!svg) {
      throw new ImageNotFoundError(id);
    }

    return svg;
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
      this.getSVG(display, "svg#record-icon").style.visibility = "visible";
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
