import chsTemplates from "@lookit/templates";
import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";
import checkmarkIcon from "../img/checkmark-icon.png";
import chromeInitialPrompt from "../img/chrome_initialprompt.png";
import chromeAlwaysAllow from "../img/chrome_step1_alwaysallow.png";
import chromePermissions from "../img/chrome_step1_permissions.png";
import firefoxInitialPrompt from "../img/firefox_initialprompt.png";
import firefoxChooseDevice from "../img/firefox_prompt_choose_device.png";
import firefoxDevicesBlocked from "../img/firefox_prompt_devices_blocked.png";
import { version } from "../package.json";
import { MicCheckError, NoStreamError } from "./errors";
import Recorder from "./recorder";
// import MicCheckProcessor from './mic_check';  // TO DO: fix or remove this. See: https://github.com/lookit/lookit-jspsych/issues/44

const info = <const>{
  name: "video-config-plugin",
  version: version,
  parameters: {
    locale: { type: ParameterType.STRING, default: "en-us" },
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
  data: {
    rt: {
      type: ParameterType.INT,
    },
    camId: {
      type: ParameterType.STRING,
    },
    micId: {
      type: ParameterType.STRING,
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

export const html_params = {
  webcam_container_id: "lookit-jspsych-webcam-container",
  reload_button_id_text: "lookit-jspsych-reload-webcam",
  reload_button_id_cam: "lookit-jspsych-reload-cam-mic",
  camera_selection_id: "lookit-jspsych-which-webcam",
  mic_selection_id: "lookit-jspsych-which-mic",
  next_button_id: "lookit-jspsych-next",
  error_msg_div_id: "lookit-jspsych-video-config-errors",
  step1_id: "lookit-jspsych-step1",
  step2_id: "lookit-jspsych-step2",
  step3_id: "lookit-jspsych-step3",
  step_complete_class: "lookit-jspsych-step-complete",
  // info/error messages
  waiting_for_access_msg: "Waiting for camera/mic access...",
  checking_mic_msg: "Checking mic input...",
  access_problem_msg: "There was a problem accessing your media devices.",
  setup_problem_msg: "There was a problem setting up your camera and mic.",
  chromeInitialPrompt,
  chromeAlwaysAllow,
  chromePermissions,
  firefoxInitialPrompt,
  firefoxChooseDevice,
  firefoxDevicesBlocked,
  checkmarkIcon,
};

/**
 * **Video Config**.
 *
 * CHS jsPsych plugin for presenting a video recording configuration plugin, to
 * help participants set up their webcam and microphone before beginning a study
 * that includes video/audio recording. This plugin must be used before any
 * other trials in the experiment can access the camera/mic.
 *
 * @author Becky Gilbert
 * @see {@link https://github.com/lookit/lookit-jspsych/blob/main/packages/video-config/README.md video-config plugin documentation on Github}
 */
export default class VideoConfigPlugin implements JsPsychPlugin<Info> {
  public static info = info;
  private display_el: HTMLElement | null = null;
  private start_time: number | null = null;
  private recorder: Recorder | null = null;
  private hasReloaded: boolean = false;
  private response: Record<"rt", null | number> = { rt: null };
  private camId: string = "";
  private micId: string = "";
  private minVolume: number = 0.1;
  private micChecked: boolean = false;
  private processorNode: AudioWorkletNode | null = null;

  /**
   * Constructor for video config plugin.
   *
   * @param jsPsych - JsPsych object automatically passed into the constructor.
   */
  public constructor(private jsPsych: JsPsych) {}

  /**
   * Trial method called by jsPsych.
   *
   * @param display_element - Element where the jsPsych trial will be displayed.
   * @param trial - Trial object with parameters/values.
   */
  public trial(display_element: HTMLElement, trial: VideoConsentTrialType) {
    this.display_el = display_element;
    // Set up the event listener for device changes.
    navigator.mediaDevices.ondevicechange = this.onDeviceChange;
    // Add page content.
    this.addHtmlContent(trial);
    // Add event listeners after elements have been added to the page.
    this.addEventListeners();
    // Begin the initial recorder setup steps.
    this.setupRecorder();
    // Record start time.
    this.start_time = performance.now();
  }

  /**
   * Add HTML content to the page.
   *
   * @param trial - Trial object.
   */
  private addHtmlContent = (trial: VideoConsentTrialType) => {
    this.display_el!.innerHTML = chsTemplates.videoConfig(trial, html_params);
  };

  /** Add event listeners to elements after they've been added to the page. */
  private addEventListeners = () => {
    // Next button.
    const next_button_el = this.display_el?.querySelector(
      `#${html_params.next_button_id}`,
    ) as HTMLButtonElement;
    next_button_el.addEventListener("click", this.nextButtonClick);
    // Reload buttons.
    (
      this.display_el?.querySelectorAll(
        `#${html_params.reload_button_id_cam}, #${html_params.reload_button_id_text}`,
      ) as NodeListOf<HTMLButtonElement>
    ).forEach((el) => el.addEventListener("click", this.reloadButtonClick));
    // Camera/mic selection elements.
    // If either value changes, then set the current values as the devices and re-run the checks.
    (
      this.display_el?.querySelectorAll(
        ".lookit-jspsych-device-selection",
      ) as NodeListOf<HTMLSelectElement>
    ).forEach((el) => {
      el.addEventListener("change", async () => {
        await this.setDevices();
        this.runStreamChecks();
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
  };

  /**
   * Access media devices, populate device lists, setup the jsPsych
   * camera/stream and Recorder instance, and run the permissions/mic checks.
   * This is run when the trial first loads and anytime the user clicks the
   * reload recorder button.
   *
   * 1. Request permissions.
   * 2. Enumerate devices and populate the device selection elements with options.
   * 3. Initialize the jsPsych recorder with the current/selected devices, and
   *    create a new Recorder.
   * 4. Run the stream checks. (If completed successfully, this will clear any
   *    error messages and enable the next button).
   */
  private setupRecorder = async () => {
    // Reset step completion states for step 1 (stream access) and 3 (mic check).
    // Don't reset step 2 (reload) because that should persist after being checked once with any Recorder/devices.
    this.updateInstructions(1, false);
    this.updateInstructions(3, false);
    this.updateErrors(html_params.waiting_for_access_msg);
    await this.requestPermission({ video: true, audio: true });
    this.updateErrors("");
    await this.onDeviceChange();
    await this.setDevices();
    await this.runStreamChecks();
  };

  /**
   * Request permission to use the webcam and/or microphone. This can be used
   * with and without specific device selection (and other constraints).
   *
   * @param constraints - Media stream constraints object with 'video' and
   *   'audio' properties, whose values can be boolean or a
   *   MediaTrackConstraints object or undefined.
   * @param constraints.video - If false, do not include video. If true, use the
   *   default webcam device. If a media track constraints object is passed,
   *   then it can contain the properties of all media tracks and video tracks:
   *   https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints.
   * @param constraints.audio - If false, do not include audio. If true, use the
   *   default mic device. If a media track constraints object is passed, then
   *   it can contain the properties of all media tracks and audio tracks:
   *   https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints.
   * @returns Camera/microphone stream.
   */
  private async requestPermission(constraints: MediaStreamConstraints) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  }

  /**
   * Receives device lists and populates the device selection HTML elements.
   * This is run when the trial loads, and in response to changes to the
   * available devices.
   *
   * @param devices - Object with properties 'cameras' and 'mics', which are
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
      `#${html_params.camera_selection_id}`,
    ) as HTMLSelectElement;
    cam_selection_el.innerHTML = "";
    const mic_selection_el = this.display_el?.querySelector(
      `#${html_params.mic_selection_id}`,
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
   * Takes the selected device IDs from the camera/mic selection elements, gets
   * the streams for these devices, sets these as the input devices via
   * jsPsych.pluginAPI.initializeCameraRecorder, and creates a new Recorder.
   */
  private setDevices = async () => {
    this.enableNext(false);
    this.updateInstructions(3, false);
    // Get the devices selected from the drop-down element.
    const selected_cam: string = (
      this.display_el?.querySelector(
        `#${html_params.camera_selection_id}`,
      ) as HTMLSelectElement
    ).value;
    this.camId = selected_cam;
    const selected_mic: string = (
      this.display_el?.querySelector(
        `#${html_params.mic_selection_id}`,
      ) as HTMLSelectElement
    ).value;
    this.micId = selected_mic;
    // Request permission for those specific devices, and initialize the jsPsych recorder.
    const stream = await this.requestPermission({
      video: { deviceId: selected_cam },
      audio: { deviceId: selected_mic },
    });
    this.initializeAndCreateRecorder(stream);
  };

  /**
   * Run the stream checks after permissions have been granted and devices have
   * been selected. This is run when the trial first loads, after permissions
   * are granted, and in response to changes to the device selection. It checks
   * for (1) the existence of the required streams, (2) minimum microphone input
   * level (when audio is included), and (3) media permissions (via recorder
   * destroy/reload). This runs the stream checks, updates the info/error
   * messages, enables the next button, and handles errors. This is factored out
   * of the set up process (setupRecorder) because it is also triggered by a
   * change in the cam/mic device selection.
   */
  private runStreamChecks = async () => {
    if (this.jsPsych.pluginAPI.getCameraRecorder() && this.recorder) {
      this.recorder.insertWebcamFeed(
        this.display_el?.querySelector(
          `#${html_params.webcam_container_id}`,
        ) as HTMLDivElement,
      );
      this.updateInstructions(1, true);
      this.updateErrors(html_params.checking_mic_msg);
      try {
        await this.checkMic();
        this.updateErrors("");
        this.updateInstructions(3, true);
        // Allow user to continue (end trial) when all checks have passed.
        if (this.hasReloaded) {
          this.enableNext(true);
        }
      } catch (e) {
        console.warn(`${e}`);
        this.updateErrors(html_params.setup_problem_msg);
        throw new Error(`${e}`);
      }
    } else {
      this.updateErrors(html_params.access_problem_msg);
      throw new NoStreamError();
    }
  };

  /**
   * If there is a change to the available devices, then we need to: (1) get the
   * updated device lists, and (2) update the select elements with these list
   * elements.
   */
  private onDeviceChange = async () => {
    const devices = await this.getDeviceLists();
    this.updateDeviceSelection(devices);
  };

  /**
   * Gets the lists of available cameras and mics (via Media Devices
   * 'enumerateDevices'). These lists can be used to populate camera/mic
   * selection elements.
   *
   * @param include_audio - Whether or not to include audio capture (mic)
   *   devices. Optional, default is true.
   * @param include_camera - Whether or not to include the webcam (video)
   *   devices. Optional, default is true.
   * @returns Object with properties 'cameras' and 'mics', containing lists of
   *   available devices.
   */
  private getDeviceLists = async (
    include_audio: boolean = true,
    include_camera: boolean = true,
  ): Promise<{ cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }> => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    let unique_cameras: Array<MediaDeviceInfo> = [];
    let unique_mics: Array<MediaDeviceInfo> = [];
    if (include_camera) {
      const cams = devices.filter(
        (d) =>
          d.kind === "videoinput" &&
          d.deviceId !== "default" &&
          d.deviceId !== "communications",
      );
      unique_cameras = cams.filter(
        (cam, index, arr) =>
          arr.findIndex((v) => v.groupId == cam.groupId) == index,
      );
    }
    if (include_audio) {
      const mics = devices.filter(
        (d_1) =>
          d_1.kind === "audioinput" &&
          d_1.deviceId !== "default" &&
          d_1.deviceId !== "communications",
      );
      unique_mics = mics.filter(
        (mic, index_1, arr_1) =>
          arr_1.findIndex((v_1) => v_1.groupId == mic.groupId) == index_1,
      );
    }
    return { cameras: unique_cameras, mics: unique_mics };
  };

  /**
   * Initialize recorder using the jsPsych plugin API. This must be called
   * before running the stream checks.
   *
   * @param stream - Media stream returned from getUserMedia that should be used
   *   to set up the jsPsych recorder.
   * @param opts - Media recorder options to use when setting up the recorder.
   */
  public initializeAndCreateRecorder = (
    stream: MediaStream,
    opts?: MediaRecorderOptions,
  ) => {
    this.jsPsych.pluginAPI.initializeCameraRecorder(stream, opts);
    this.recorder = new Recorder(this.jsPsych);
  };

  /**
   * Perform a sound check on the audio input (microphone).
   *
   * @param minVol - Minimum mic activity needed to reach the mic check
   *   threshold (optional). Default is `this.minVolume`
   * @returns Promise that resolves when the mic check is complete because the
   *   audio stream has reached the required minimum level.
   */
  private checkMic = async (minVol: number = this.minVolume) => {
    if (this.jsPsych.pluginAPI.getCameraStream()) {
      const audioContext = new AudioContext();
      const microphone = audioContext.createMediaStreamSource(
        this.jsPsych.pluginAPI.getCameraStream(),
      );
      try {
        // This currently loads from lookit-api static files.
        // TO DO: load mic_check.js from dist or a URL? See https://github.com/lookit/lookit-jspsych/issues/44
        await audioContext.audioWorklet.addModule("/static/js/mic_check.js");
        await this.createConnectProcessor(audioContext, microphone);
        await this.setupPortOnMessage(minVol);
      } catch (err) {
        throw new MicCheckError(err);
      }
    } else {
      throw new NoStreamError();
    }
  };

  /**
   * Handle the mic level messages that are sent via an AudioWorkletProcessor.
   * This checks the current level against the minimum threshold, and if the
   * threshold is met, sets the micChecked property to true and resolves the
   * checkMic promise.
   *
   * @param currentActivityLevel - Microphone activity level calculated by the
   *   processor node.
   * @param minVolume - Minimum microphone activity level needed to pass the
   *   microphone check.
   * @param resolve - Resolve callback function for Promise returned by the
   *   checkMic method.
   */
  private onMicActivityLevel(
    currentActivityLevel: number,
    minVolume: number,
    resolve: () => void,
  ) {
    if (currentActivityLevel > minVolume) {
      this.micChecked = true;
      this.processorNode?.port.postMessage({ micChecked: true });
      this.processorNode = null;
      resolve();
    }
  }

  /**
   * Creates the processor node for the mic check input level processing, and
   * connects the microphone to the processor node.
   *
   * @param audioContext - Audio context that was created in checkMic. This is
   *   used to create the processor node.
   * @param microphone - Microphone audio stream source, created in checkMic.
   *   The processor node will be connected to this source.
   * @returns Promise that resolves after the processor node has been created,
   *   and the microphone audio stream source is connected to the processor node
   *   and audio context destination.
   */
  private createConnectProcessor(
    audioContext: AudioContext,
    microphone: MediaStreamAudioSourceNode,
  ) {
    return new Promise<void>((resolve) => {
      this.processorNode = new AudioWorkletNode(
        audioContext,
        "mic-check-processor",
      );
      microphone.connect(this.processorNode).connect(audioContext.destination);
      resolve();
    });
  }

  /**
   * Set up the port's on message event handler for the mic check processor
   * node. This adds the event related callback, which calls onMicActivityLevel
   * with the event data.
   *
   * @param minVol - Minimum volume level (RMS amplitude) passed from checkMic.
   * @returns Promise that resolves from inside the onMicActivityLevel callback,
   *   when the mic stream input level has reached the threshold.
   */
  private setupPortOnMessage(minVol: number) {
    return new Promise<void>((resolve) => {
      /**
       * Callback on the microphone's AudioWorkletNode that fires in response to
       * a message event containing the current mic level. When the mic level
       * reaches the threshold, this callback sets the micChecked property to
       * true and resolves this Promise (via onMicActivityLevel).
       *
       * @param event - The message event that was sent from the processor on
       *   the audio worklet node. Contains a 'data' property (object) which
       *   contains a 'volume' property (number).
       */
      this.processorNode!.port.onmessage = (event: MessageEvent) => {
        // handle message from the processor: event.data
        if (this.onMicActivityLevel) {
          if ("data" in event && "volume" in event.data) {
            this.onMicActivityLevel(event.data.volume, minVol, resolve);
          }
        }
      };
    });
  }

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
        step_id = html_params.step1_id;
        break;
      }
      case 2: {
        step_id = html_params.step2_id;
        break;
      }
      case 3: {
        step_id = html_params.step3_id;
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
   * Update the errors/messages div with information for the user about the
   * camera/mic checks.
   *
   * @param errorMsg - Message to display in the error message div. Pass an
   *   empty string to clear any existing errors/messages.
   */
  private updateErrors = (errorMsg: string) => {
    const error_msg_div = this.display_el?.querySelector(
      `#${html_params.error_msg_div_id}`,
    ) as HTMLDivElement;
    error_msg_div.innerHTML = errorMsg;
  };

  /**
   * Collect trial data and end the trial. JsPsych.finishTrial takes the
   * plugin's trial data as an argument, ends the trial, and moves on to the
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
   * Destroy the recorder. This is used to stop the streams at the end of the
   * trial, and as part of the reload check to test the user's browser
   * permissions by mimicking the start of a new trial (i.e. stop streams and
   * then create a new Recorder instance).
   */
  private destroyRecorder = () => {
    if (this.recorder) {
      this.recorder.stopTracks();
      this.recorder.reset();
      this.recorder = null;
    }
    this.enableNext(false);
    this.updateInstructions(3, false);
    this.updateInstructions(1, false);
  };

  /** Handle the next button click event. */
  private nextButtonClick = () => {
    const end_time = performance.now();
    const rt = this.start_time ? Math.round(end_time - this.start_time) : null;
    this.response.rt = rt;
    this.destroyRecorder();
    this.endTrial();
  };

  /** Handle the reload recorder button click event. */
  private reloadButtonClick = () => {
    this.hasReloaded = true;
    this.updateInstructions(2, true);
    this.destroyRecorder();
    this.setupRecorder();
  };

  /**
   * Toggle the next button disable property.
   *
   * @param enable - Whether to enable (true) or disable (false) the next
   *   button.
   */
  private enableNext = (enable: boolean) => {
    const next_button_el = this.display_el?.querySelector(
      `#${html_params.next_button_id}`,
    ) as HTMLButtonElement;
    if (enable) {
      next_button_el.disabled = false;
      next_button_el.classList.add(`${html_params.step_complete_class}`);
    } else {
      next_button_el.disabled = true;
      next_button_el.classList.remove(`${html_params.step_complete_class}`);
    }
  };
}
