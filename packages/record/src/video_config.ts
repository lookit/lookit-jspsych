import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import Mustache from "mustache";
import video_config from "../templates/video-config.mustache";
import { NoStreamError } from "./error";
import chromeInitialPrompt from "./img/chrome_initialprompt.png";
import chromeAlwaysAllow from "./img/chrome_step1_alwaysallow.png";
import chromePermissions from "./img/chrome_step1_permissions.png";
import firefoxInitialPrompt from "./img/firefox_initialprompt.png";
import firefoxChooseDevice from "./img/firefox_prompt_choose_device.png";
import firefoxDevicesBlocked from "./img/firefox_prompt_devices_blocked.png";
import Recorder from "./recorder";

const info = <const>{
  name: "video-config-plugin",
  parameters: {
    troubleshooting_intro: {
      /**
       * Optional string to appear at the start of the "Setup tips and
       * troubleshooting" section.
       */
      type: ParameterType.HTML_STRING,
      default: "",
      pretty_name: "Troubleshooting Intro",
    },
  },
};

type Info = typeof info;

export type VideoConsentTrialType = TrialType<Info>;

interface MediaDeviceInfo {
  label: string;
  deviceId: string;
  kind: string;
  groupId: string;
}

/**
 * **Video Config**.
 *
 * CHS jsPsych plugin for presenting a video recording configuration plugin, to
 * help participants set up their webcam and microphone before beginning a study
 * that includes video/audio recording.
 *
 * @author Becky Gilbert
 * @see {@link https://github.com/lookit/lookit-jspsych/blob/main/packages/video-config/README.md video-config plugin documentation on Github}
 */
export default class VideoConfigPlugin implements JsPsychPlugin<Info> {
  public static info = info;
  private display_el: HTMLElement | null = null;
  private start_time: number | null = null;
  private recorder!: Recorder | null;
  private hasCamMicAccess: boolean = false;
  private hasReloaded: boolean = false;
  private response: Record<"rt", null | number> = { rt: null };
  private camId: string = "";
  private micId: string = "";
  // HTML IDs and classes
  private webcam_container_id: string = "lookit-jspsych-webcam-container";
  private reload_button_id_text: string = "lookit-jspsych-reload-webcam";
  private reload_button_id_cam: string = "lookit-jspsych-reload-cam-mic";
  private camera_selection_id: string = "lookit-jspsych-which-webcam";
  private mic_selection_id: string = "lookit-jspsych-which-mic";
  private next_button_id: string = "lookit-jspsych-next";
  private error_msg_div_id: string = "lookit-jspsych-video-config-errors";
  private step1_id: string = "lookit-jspsych-step1";
  private step2_id: string = "lookit-jspsych-step2";
  private step3_id: string = "lookit-jspsych-step3";
  private step_complete_class: string = "lookit-jspsych-step-complete";
  // info/error messages
  private step_complete_text: string = "Done!";
  private waiting_for_access_msg: string = "Waiting for camera/mic access...";
  private checking_mic_msg: string = "Checking mic input...";
  private access_problem_msg: string =
    "There was a problem accessing your media devices.";
  private setup_problem_msg: string =
    "There was a problem setting up your camera and mic.";

  /**
   * Constructor for video config plugin.
   *
   * @param jsPsych - JsPsych object automatically passed into the constructor.
   */
  public constructor(private jsPsych: JsPsych) {}

  /**
   * Trial method.
   *
   * @param display_element - Element where the jsPsych trial will be displayed.
   * @param trial - Trial object with parameters/values.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- For the unused trial argument
  public trial(display_element: HTMLElement, trial: VideoConsentTrialType) {
    this.display_el = display_element;

    // Set up the event listener for device changes.
    navigator.mediaDevices.ondevicechange = this.onDeviceChange;

    // Add page content.
    this.addHtmlContent(trial.troubleshooting_intro as string);

    // Add event listeners after elements have been added to the page.
    this.addEventListeners();

    // Begin the initial recorder setup steps.
    this.setupRecorder();

    // Record start time.
    this.start_time = performance.now();
  }

  /**
   * Function to populate the device selection elements. This is run when the
   * trial loads, and in response to changes to the available devices.
   *
   * @param devices - Object with properti es 'cameras' and 'mics', which are
   *   arrays containing lists of available devices.
   * @param devices.cameras - Array of MediaDeviceInfo objects for webcam/video
   *   input devices.
   * @param devices.mics - Array of MediaDeviceInfo objects for mic/audio input
   *   devices.
   */
  private updateDeviceSelection = (devices: {
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
  }) => {
    // Clear any existing options in select elements
    const cam_selection_el = this.display_el?.querySelector(
      `#${this.camera_selection_id}`,
    ) as HTMLSelectElement;
    cam_selection_el.innerHTML = "";
    const mic_selection_el = this.display_el?.querySelector(
      `#${this.mic_selection_id}`,
    ) as HTMLSelectElement;
    mic_selection_el.innerHTML = "";
    // Populate select elements with current device options.
    // If any of the devices were previously selected, then select them again.
    devices.cameras.forEach((d: MediaDeviceInfo) => {
      const el = document.createElement("option");
      el.value = d.deviceId;
      el.innerHTML = d.label;
      cam_selection_el.appendChild(el);
      if (this.camId == el.value) {
        cam_selection_el.value = el.value;
      }
    });
    devices.mics.forEach((d: MediaDeviceInfo) => {
      const el = document.createElement("option");
      el.value = d.deviceId;
      el.innerHTML = d.label;
      mic_selection_el.appendChild(el);
      if (this.micId == el.value) {
        mic_selection_el.value = el.value;
      }
    });
  };

  /**
   * Function to setup the Recorder and run the permissions/mic checks. This is
   * run when the trial first loads and anytime the user clicks the reload
   * recorder button.
   *
   * 1. Setup a new recorder instance.
   * 2. Request permissions, if necessary.
   * 3. Enumerate devices and populate the device selection elements with options.
   * 4. Setup the recorder with the current/selected devices.
   * 5. Run the stream checks. (If completed successfully, this will clear any
   *    error messages and enable the next button).
   *
   * @returns Promise that resolves when the stream checks have finished
   *   successfully.
   */
  private setupRecorder = () => {
    // Reset step completion states for step 1 (stream access) and 3 (mic check).
    // Don't reset step 2 (reload) because that should persist after being checked once with any Recorder/devices.
    this.updateInstructions(1, false);
    this.updateInstructions(3, false);
    this.updateErrors(this.waiting_for_access_msg);
    this.recorder = new Recorder(this.jsPsych, "video_config");
    return this.recorder
      .requestPermission({ video: true, audio: true })
      .then(() => {
        this.updateErrors("");
        return this.recorder!.getDeviceLists();
      })
      .then(
        (devices: { cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }) => {
          // Update the device choices listed in the selection elements
          this.updateDeviceSelection(devices);
          // Get the stream with the selected devices
          // (returns a promise because it requires getUserMedia, and user may need to give permissions again)
          return this.setDevices();
        },
      )
      .then(this.runStreamChecks);
  };

  /**
   * Takes the selected device IDs from the camera/mic selection elements, gets
   * the streams for these devices, and sets these as the input devices via
   * jsPsych.pluginAPI.initializeMicrophoneRecorder and
   * jsPsych.pluginAPI.initializeCameraRecorder.
   *
   * @returns Promise that resolves with the stream for the selected camera and
   *   mic.
   */
  private setDevices = () => {
    this.enable_next(false);
    this.updateInstructions(3, false);
    // Get the devices selected from the drop-down element.
    const selected_cam: string = (
      this.display_el?.querySelector(
        `#${this.camera_selection_id}`,
      ) as HTMLSelectElement
    ).value;
    this.camId = selected_cam;
    const selected_mic: string = (
      this.display_el?.querySelector(
        `#${this.mic_selection_id}`,
      ) as HTMLSelectElement
    ).value;
    this.micId = selected_mic;
    // Request permission for those specific devices, and initialize the jsPsych recorder.
    return this.recorder!.requestPermission({
      video: { deviceId: selected_cam },
      audio: { deviceId: selected_mic },
    }).then((stream) => {
      this.recorder!.intializeRecorder(stream);
    });
  };

  /**
   * Function to collect trial data and end the trial. JsPsych.finishTrial takes
   * the plugin's trial data as an argument, ends the trial, and moves on to the
   * next trial in the experiment timeline.
   */
  private endTrial = () => {
    const trial_data = {
      rt: this.response.rt,
      camId: this.camId,
      micId: this.micId,
    };
    this.jsPsych.finishTrial(trial_data);
  };

  /**
   * Destroy the recorder.
   *
   * @returns Promise that resolves when the recorder has been destroyed and
   *   variables reset to initial values.
   */
  private destroyRecorder = async () => {
    await this.recorder?.destroy();
    this.recorder = null;
    this.hasCamMicAccess = false;
    this.enable_next(false);
    this.updateInstructions(3, false);
    this.updateInstructions(1, false);
  };

  /** Function to handle the next button click event. */
  private nextButtonClick = async () => {
    const end_time = performance.now();
    const rt = this.start_time ? Math.round(end_time - this.start_time) : null;
    this.response.rt = rt;
    await this.destroyRecorder();
    this.endTrial();
  };

  /** Function to handle the reload recorder button click event. */
  private reloadButtonClick = async () => {
    this.hasReloaded = true;
    this.updateInstructions(2, true);
    await this.destroyRecorder();
    this.setupRecorder();
  };

  /**
   * Private helper to add initial HTML content to the page.
   *
   * @param troubleshooting_intro - Troubleshooting intro parameter from the
   *   Trial object.
   */
  private addHtmlContent(troubleshooting_intro: string) {
    const html_params = {
      webcam_container_id: this.webcam_container_id,
      reload_button_id_cam: this.reload_button_id_cam,
      camera_selection_id: this.camera_selection_id,
      mic_selection_id: this.mic_selection_id,
      step1_id: this.step1_id,
      step2_id: this.step2_id,
      step3_id: this.step3_id,
      step_complete_class: this.step_complete_class,
      step_complete_text: this.step_complete_text,
      reload_button_id_text: this.reload_button_id_text,
      next_button_id: this.next_button_id,
      chromeInitialPrompt,
      chromeAlwaysAllow,
      chromePermissions,
      firefoxInitialPrompt,
      firefoxChooseDevice,
      firefoxDevicesBlocked,
      troubleshooting_intro,
    };
    this.display_el!.innerHTML = Mustache.render(video_config, html_params);
  }

  /** Add event listeners to elements after they've been added to the page. */
  private addEventListeners() {
    // Next button.
    const next_button_el = this.display_el?.querySelector(
      `#${this.next_button_id}`,
    ) as HTMLButtonElement;
    next_button_el.addEventListener("click", this.nextButtonClick);

    // Reload buttons.
    (
      this.display_el?.querySelectorAll(
        `#${this.reload_button_id_cam}, #${this.reload_button_id_text}`,
      ) as NodeListOf<HTMLButtonElement>
    ).forEach((el) => el.addEventListener("click", this.reloadButtonClick));

    // Camera/mic selection elements.
    // If either value changes, then set the current values as the devices and re-run the checks.
    (
      this.display_el?.querySelectorAll(
        ".lookit-jspsych-device-selection",
      ) as NodeListOf<HTMLSelectElement>
    ).forEach((el) => {
      el.addEventListener("change", () => {
        this.setDevices().then(this.runStreamChecks);
      });
    });

    // Accordion section (Setup tips and troubleshooting)
    const accButtons = document.getElementsByClassName(
      "lookit-jspsych-accordion",
    ) as HTMLCollectionOf<HTMLButtonElement>;
    for (let i = 0; i < accButtons.length; i++) {
      accButtons[i].addEventListener("click", function () {
        this.classList.toggle("active");
        const panel = this.nextElementSibling as HTMLDivElement;
        if (panel.style.display === "block") {
          panel.style.display = "none";
        } else {
          panel.style.display = "block";
        }
      });
    }
  }

  /**
   * Toggle the next button disable property.
   *
   * @param enable - Whether to enable (true) or disable (false) the next
   *   button.
   */
  private enable_next = (enable: boolean) => {
    const next_button_el = this.display_el?.querySelector(
      `#${this.next_button_id}`,
    ) as HTMLButtonElement;
    if (enable) {
      next_button_el.disabled = false;
      next_button_el.classList.add(`${this.step_complete_class}`);
    } else {
      next_button_el.disabled = true;
      next_button_el.classList.remove(`${this.step_complete_class}`);
    }
  };

  /**
   * Function to run the stream checks after permissions have been granted and
   * devices have been selected. This is run when the trial first loads, after
   * permissions are granted, and in response to changes to the device
   * selection. It checks for (1) the existence of the required streams, (2)
   * minimum microphone input level (when audio is included), and (3) media
   * permissions (via recorder destroy/reload). This runs the stream checks,
   * updates the info/error messages, enables the next button, and handles
   * errors. This is factored out of the set up process (setupRecorder) because
   * it is also triggered by a change in the cam/mic device selection.
   *
   * @returns Promise that resolves when the stream checks have finished
   *   successfully, the next button has been enabled, info/error messages
   *   updated, and errors handled.
   */
  private runStreamChecks = () => {
    this.hasCamMicAccess = this.recorder ? this.recorder.camMicAccess() : false;
    if (this.hasCamMicAccess) {
      this.recorder!.insertWebcamFeed(
        this.display_el?.querySelector(
          `#${this.webcam_container_id}`,
        ) as HTMLDivElement,
      );
      this.updateInstructions(1, true);
      this.updateErrors(this.checking_mic_msg);

      return this.recorder!.checkMic()
        .then(() => {
          this.updateErrors("");
          this.updateInstructions(3, true);
          if (this.hasReloaded) {
            this.enable_next(true);
          }
        })
        .catch((e) => {
          console.warn(`${e}`);
          this.updateErrors(this.setup_problem_msg);
          throw new Error(`${e}`);
        });
    } else {
      this.updateErrors(this.access_problem_msg);
      throw new NoStreamError();
    }
  };

  /**
   * Update the instructions for a given step, based on whether or not the check
   * has passed for that step.
   *
   * @param step - Which instructions step to update. 1 = stream access, 2 =
   *   reload complete, 3 = mic level check.
   * @param checkPassed - Whether or not the mic check has passed.
   */
  private updateInstructions = (step: number, checkPassed: boolean) => {
    // Get the IDs for the elements we need to update.
    let step_id = null;
    switch (step) {
      case 1: {
        step_id = this.step1_id;
        break;
      }
      case 2: {
        step_id = this.step2_id;
        break;
      }
      case 3: {
        step_id = this.step3_id;
        break;
      }
    }
    const step_complete_span = this.display_el?.querySelector(
      `#${step_id}-span`,
    ) as HTMLSpanElement;
    const step_paragraph = this.display_el?.querySelector(
      `#${step_id}-paragraph`,
    ) as HTMLParagraphElement;
    if (step_complete_span && step_paragraph) {
      if (checkPassed) {
        step_complete_span.style.visibility = "visible";
        step_paragraph.style.color = "gray";
      } else {
        step_complete_span.style.visibility = "hidden";
        step_paragraph.style.color = "black";
      }
    }
  };

  /**
   * Function to update the errors/messages div with information for the user
   * about the camera/mic checks.
   *
   * @param errorMsg - Message to display in the error message div. Pass an
   *   empty string to clear any existing errors/messages.
   */
  private updateErrors = (errorMsg: string) => {
    const error_msg_div = this.display_el?.querySelector(
      `#${this.error_msg_div_id}`,
    ) as HTMLDivElement;
    error_msg_div.innerHTML = errorMsg;
  };

  /**
   * If there is a change to the available devices, then we need to: (1) get the
   * updated device lists, and (2) update the select elements with these list
   * elements.
   */
  private onDeviceChange = () => {
    this.recorder
      ?.getDeviceLists()
      .then(
        (devices: { cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }) => {
          this.updateDeviceSelection(devices);
        },
      );
  };
}
