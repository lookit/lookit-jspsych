import { LookitWindow } from "@lookit/data/dist/types";
import chsTemplates from "@lookit/templates";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import checkmarkIcon from "../img/checkmark-icon.png";
import xIcon from "../img/xmark.png";
import { version } from "../package.json";
import { ElementNotFoundError } from "./errors";
import Recorder from "./recorder";
import { ageInYears } from "./utils";

declare const window: LookitWindow;

const info = <const>{
  name: "assent-video",
  version,
  parameters: {
    /**
     * Locale code to use for translating all default text. The translation of
     * button labels can be overriden by setting them directly via parameters.
     */
    locale: { type: ParameterType.STRING, default: "en-us" },
    /**
     * Array of objects, where each object defines the content to be shown on a
     * page. Pages should be used to provide information about the study. The
     * objects must contain at least one of: "stimulus", which is the HTML
     * stimulus to be shown on the page, "show_webcam", which is the webcam
     * feed.
     */
    pages: {
      type: ParameterType.COMPLEX,
      array: true,
      default: undefined,
      nested: {
        stimulus: {
          type: ParameterType.HTML_STRING,
          default: "",
        },
        show_webcam: {
          type: ParameterType.BOOL,
          default: false,
        },
      },
    },
    /**
     * If the child is younger than this age, in years, then jsPsych will skip
     * this trial with skipped: true in the data.
     */
    min_age_to_assent: {
      type: ParameterType.INT,
      default: 0,
    },
    /** Question that should be shown above the yes/no buttons. */
    participation_question: {
      type: ParameterType.STRING,
      default: "Do you want to participate in this study?",
    },
    /**
     * Label for the 'yes' button, indicating that the child wants to
     * participate. Setting this will override the default "Yes" (or appropriate
     * translation based on locale).
     */
    yes_button: {
      type: ParameterType.STRING,
      default: null, // Yes
    },
    /**
     * Label for the 'no' button, indicating that the child does not want to
     * participate. Setting this will override the default "No" (or appropriate
     * translation based on locale).
     */
    no_button: {
      type: ParameterType.STRING,
      default: null, // No
    },
    /**
     * Label for the 'next' button that is shown to navigate content pages (if
     * more than one). Setting this will override the default "Next" (or
     * appropriate translation based on locale).
     */
    next_button: {
      type: ParameterType.STRING,
      default: null, // Next
    },
    /**
     * Label for the 'previous' button that is shown to navigate content pages
     * (if more than one). Setting this will override the default "Previous" (or
     * appropriate translation based on locale).
     */
    previous_button: {
      type: ParameterType.STRING,
      default: null,
    },
    /**
     * Label for the 'continue' button the participant clicks to confirm their
     * response and end the trial. Setting this will override the default
     * "Continue" (or appropriate translation based on locale).
     */
    continue_button: {
      type: ParameterType.STRING,
      default: null,
    },
    /**
     * Whether or not to record the whole trial procedure. If true and
     * record_last_page is also true, this will take precedence.
     */
    record_whole_procedure: {
      type: ParameterType.BOOL,
      default: false,
    },
    /**
     * Whether or not to record starting from the final content page. If true,
     * then record_whole_procedure should be false.
     */
    record_last_page: {
      type: ParameterType.BOOL,
      default: false,
    },
  },
  data: {
    chs_type: {
      /** "assent" */
      type: ParameterType.STRING,
    },
    /**
     * Whether the child clicked the 'yes' button to agree to participate
     * (true), or clicked the 'no' button to indicate that they do not assent
     * (false).
     */
    response: {
      type: ParameterType.BOOL,
    },
    /** Child's age in years */
    child_age_years: {
      type: ParameterType.INT,
    },
    /**
     * If true, the trial was skipped due to the child being younger than the
     * min_age_to_assent value
     */
    skipped: {
      type: ParameterType.BOOL,
    },
  },
};
type Info = typeof info;

/** The video assent plugin. */
export class VideoAssentPlugin implements JsPsychPlugin<Info> {
  public static readonly info = info;
  private readonly recorder: Recorder;
  private readonly video_container_id = "lookit-jspsych-video-container";
  private readonly msg_container_id = "lookit-jspsych-video-msg-container";
  private readonly page_container_id = "lookit-jspsych-assent-page-container";
  private readonly resp_btn_container_id =
    "lookit-jspsych-assent-resp-btn-container";
  private readonly pages_nav_container_id =
    "lookit-jspsych-assent-pages-nav-container";
  private uploadingMsg: string | null = null;
  private startingMsg: string | null = null;
  private recordingMsg: string | null = null;
  private notRecordingMsg: string | null = null;
  private childAge: number | null = null;
  private pageIndex: number = 0;
  private response: boolean | null = null;
  private startPromise: Promise<void> | null = null;
  private recordingActive: boolean = false;

  /**
   * Instantiate video assent plugin.
   *
   * @param jsPsych - JsPsych object
   */
  public constructor(private readonly jsPsych: JsPsych) {
    this.jsPsych = jsPsych;
    this.recorder = new Recorder(this.jsPsych);
    if (window.chs.child.attributes.birthday) {
      // birthday is a string with the format YYYY-MM-DD
      this.childAge = ageInYears(
        new Date(window.chs.child.attributes.birthday),
      );
    }
  }

  /**
   * Function to run the trial.
   *
   * @param display - HTML element for experiment.
   * @param trial - Trial data including user supplied parameters.
   */
  public trial(display: HTMLElement, trial: TrialType<Info>) {
    if (
      this.childAge !== null &&
      trial.min_age_to_assent! > 0 &&
      this.childAge < trial.min_age_to_assent!
    ) {
      this.jsPsych.finishTrial({
        skipped: true,
        response: null,
        child_age_years: this.childAge,
      });
      return;
    }

    // Get trial HTML string from templates package. This will also set the i18n locale.
    // Translate the default button labels if they have not been set explicitly
    const assentVideo = chsTemplates.assentVideo(
      trial,
      checkmarkIcon,
      xIcon,
      {
        video_container_id: this.video_container_id,
        msg_container_id: this.msg_container_id,
        page_container_id: this.page_container_id,
        resp_btn_container_id: this.resp_btn_container_id,
        pages_nav_container_id: this.pages_nav_container_id,
      },
      {
        yes_btn: trial.yes_button ?? chsTemplates.translateString("Yes"),
        no_btn: trial.no_button ?? chsTemplates.translateString("No"),
        next_btn: trial.next_button ?? chsTemplates.translateString("Next"),
        prev_btn:
          trial.previous_button ?? chsTemplates.translateString("Previous"),
        done_btn:
          trial.continue_button ?? chsTemplates.translateString("Continue"),
      },
    );

    // Add rendered document to display HTML
    display.insertAdjacentHTML("afterbegin", assentVideo);

    // Add page content
    this.displayCurrentPage(display, trial);

    // Set event listeners for buttons.
    this.yesButton(display, trial);
    this.noButton(display, trial);
    this.doneButton(display);
    if (trial.pages.length > 1) {
      // Display nav buttons if there is more than one page
      this.previousButton(display, trial);
      this.nextButton(display, trial);
    }

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

    if (
      trial.record_whole_procedure ||
      (trial.record_last_page && trial.pages.length === 1)
    ) {
      this.startRecording(display);
    }
  }

  /**
   * Add webcam feed to HTML.
   *
   * @param display - HTML element for experiment.
   */
  private recordFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    videoContainer.style.display = "";
    this.recorder.insertRecordFeed(videoContainer);
    this.getImg(display, "record-icon").style.visibility = "hidden";
  }

  /**
   * Clear the video container when no webcam feed should be shown.
   *
   * @param display - HTML element for experiment.
   */
  private hideRecordFeed(display: HTMLElement) {
    const videoContainer = this.getVideoContainer(display);
    videoContainer.style.display = "none";
    videoContainer.innerHTML = "";
  }

  /**
   * Show the recording message container
   *
   * @param display - HTML element for experiment.
   */
  private showMsgContainer(display: HTMLElement) {
    this.getMessageContainer(display).style.display = "";
  }

  /**
   * Hide the recording message container
   *
   * @param display - HTML element for experiment.
   */
  private hideMsgContainer(display: HTMLElement) {
    this.getMessageContainer(display).style.display = "none";
  }

  /**
   * Start recording and update the status message. Sets startPromise so
   * endTrial can await it before stopping.
   *
   * @param display - HTML element for experiment.
   */
  private startRecording(display: HTMLElement) {
    this.addMessage(display, this.startingMsg!);
    this.startPromise = this.recorder
      .start(false, VideoAssentPlugin.info.name)
      .then(() => {
        this.recordingActive = true;
        this.addMessage(display, this.recordingMsg!);
        try {
          this.getImg(display, "record-icon").style.visibility = "visible";
        } catch {
          // No record icon in DOM — webcam not shown on current page
        }
      });
  }

  /**
   * Update the researcher-provided page content based on the current pageIndex
   * value.
   *
   * @param display - HTML element for experiment.
   * @param trial - The trial object containing the pages array.
   */
  private displayCurrentPage(display: HTMLElement, trial: TrialType<Info>) {
    const pageContainer = this.getPageContainer(display);
    pageContainer.innerHTML = trial.pages[this.pageIndex].stimulus;

    const willRecord = trial.record_whole_procedure || trial.record_last_page;

    if (trial.pages[this.pageIndex].show_webcam) {
      this.showMsgContainer(display);
      this.recordFeed(display);
      if (this.recordingActive) {
        this.getImg(display, "record-icon").style.visibility = "visible";
      }
    } else {
      this.hideRecordFeed(display);
      if (willRecord) {
        this.showMsgContainer(display);
      } else {
        this.hideMsgContainer(display);
      }
    }
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
      throw new ElementNotFoundError(this.msg_container_id, "div");
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
   * Retrieve page container element.
   *
   * @param display - HTML element for experiment.
   * @returns Page container
   */
  private getPageContainer(display: HTMLElement) {
    const pageContainer = display.querySelector<HTMLDivElement>(
      `div#${this.page_container_id}`,
    );

    if (!pageContainer) {
      throw new ElementNotFoundError(this.page_container_id, "div");
    }

    return pageContainer;
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
      throw new ElementNotFoundError(this.video_container_id, "div");
    }

    return videoContainer;
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
    id: "next" | "previous" | "done" | "yes" | "no",
  ) {
    const btn = display.querySelector<HTMLButtonElement>(`button#${id}`);
    if (!btn) {
      throw new ElementNotFoundError(id, "button");
    }
    return btn;
  }

  /**
   * Set the disabled state of a button element from DOM.
   *
   * @param display - HTML element for experiment.
   * @param id - Element id
   * @param disable - Boolean indicating whether or not to disable the button.
   */
  private setBtnDisabled(
    display: HTMLElement,
    id: "next" | "previous" | "done" | "yes" | "no",
    disable: boolean,
  ) {
    const btn = this.getButton(display, id);
    btn.disabled = disable;
  }

  /**
   * Select and return the image element.
   *
   * @param display - HTML element for experiment.
   * @param id - ID string of Image element
   * @returns Image Element
   */
  private getImg(display: HTMLElement, id: string) {
    const img = display.querySelector<HTMLImageElement>(`img#${id}`);

    if (!img) {
      throw new ElementNotFoundError(id, "img");
    }

    return img;
  }

  /**
   * Add next button event listener.
   *
   * @param display - HTML element for experiment.
   * @param trial - The trial object - used to get the length of the pages array
   *   and the pages content for displayCurrentPage.
   */
  private nextButton(display: HTMLElement, trial: TrialType<Info>) {
    const next = this.getButton(display, "next");
    next.addEventListener("click", () => {
      this.pageIndex++;
      this.displayCurrentPage(display, trial);
      this.setBtnDisabled(display, "previous", false);
      const last_page_index = trial.pages.length - 1;
      if (this.pageIndex == last_page_index) {
        this.setBtnDisabled(display, "next", true);
        this.setBtnDisabled(display, "yes", false);
        this.setBtnDisabled(display, "no", false);
        if (trial.record_last_page && !this.startPromise) {
          this.startRecording(display);
        }
      } else {
        this.setBtnDisabled(display, "next", false);
      }
    });
  }

  /**
   * Add previous button event listener.
   *
   * @param display - HTML element for experiment.
   * @param trial - The trial object - used to get the pages content for
   *   displayCurrentPage.
   */
  private previousButton(display: HTMLElement, trial: TrialType<Info>) {
    const previous = this.getButton(display, "previous");
    previous.addEventListener("click", () => {
      if (this.pageIndex !== 0) {
        this.pageIndex--;
        this.displayCurrentPage(display, trial);
        this.setBtnDisabled(display, "next", false);
        if (this.pageIndex == 0) {
          this.setBtnDisabled(display, "previous", true);
        } else {
          this.setBtnDisabled(display, "previous", false);
        }
      }
    });
  }

  /**
   * Add yes button event listener.
   *
   * @param display - HTML element for experiment.
   * @param trial - Trial object passed to plugin
   */
  private yesButton(display: HTMLElement, trial: TrialType<Info>) {
    const yes = this.getButton(display, "yes");
    yes.addEventListener("click", () => {
      this.response = true;
      yes.classList.remove("not-selected");
      const no = this.getButton(display, "no");
      no.classList.add("not-selected");
      this.setBtnDisabled(display, "done", false);
    });
    // If there's only one page, enable the yes button immediately
    if (trial.pages.length < 2) {
      this.setBtnDisabled(display, "yes", false);
    }
  }

  /**
   * Add no button event listener.
   *
   * @param display - HTML element for experiment.
   * @param trial - Trial object passed to plugin
   */
  private noButton(display: HTMLElement, trial: TrialType<Info>) {
    const no = this.getButton(display, "no");
    no.addEventListener("click", () => {
      this.response = false;
      no.classList.remove("not-selected");
      const yes = this.getButton(display, "yes");
      yes.classList.add("not-selected");
      this.setBtnDisabled(display, "done", false);
    });
    // If there's only one page, enable the no button immediately
    if (trial.pages.length < 2) {
      this.setBtnDisabled(display, "no", false);
    }
  }

  /**
   * Add done button event listener.
   *
   * @param display - HTML element for experiment.
   */
  private doneButton(display: HTMLElement) {
    const done = this.getButton(display, "done");
    done.addEventListener("click", () => this.endTrial(display));
  }

  /**
   * Stop any active recording, then finish the trial.
   *
   * @param display - HTML element for experiment.
   */
  private async endTrial(display: HTMLElement) {
    if (this.startPromise) {
      this.setBtnDisabled(display, "done", true);
      await this.startPromise;
      this.addMessage(display, this.uploadingMsg!);
      const { stopped } = this.recorder.stop();
      await stopped;
    }
    this.jsPsych.finishTrial({
      response: this.response,
      child_age_years: this.childAge,
    });
  }

  /**
   * Add CHS type to experiment data.
   *
   * @returns Object containing CHS type.
   */
  public static chsData() {
    return { chs_type: "assent" };
  }
}
