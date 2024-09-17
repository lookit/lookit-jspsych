import { JsPsych, JsPsychPlugin, TrialType } from "jspsych";
import Mustache from "mustache";
import Recorder from "./recorder";
import video_config from "./templates/video-config.mustache";

const info = <const>{
  name: "video-config-plugin",
  parameters: {},
};

type Info = typeof info;

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
  private recorder!: Recorder | null;
  private hasCamMicAccess: boolean = false;
  private hasReloaded: boolean = false;
  private response: Record<"rt", null | number> = { rt: null };
  private camId: string = "";
  private micId: string = "";

  /**
   * Constructor for video config plugin.
   *
   * @param jsPsych - JsPsych object automatically passed into the constructor.
   */
  public constructor(private jsPsych: JsPsych) {
  }

  /**
   * Trial method.
   *
   * @param display_element - Element where the jsPsych trial will be displayed.
   * @param trial - Trial object with parameters/values.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- For the unused trial argument
  public trial(display_element: HTMLElement, trial: TrialType<Info>) {
    const webcam_container_id = "lookit-jspsych-webcam-container";
    const reload_button_id_text = "lookit-jspsych-reload-webcam";
    const reload_button_id_cam = "lookit-jspsych-reload-cam-mic";
    const camera_selection_id = "lookit-jspsych-which-webcam";
    const mic_selection_id = "lookit-jspsych-which-mic";
    const next_button_id = "lookit-jspsych-next";
    const error_msg_div_id = "lookit-jspsych-video-config-errors";
    const step1_id = "lookit-jspsych-step1";
    const step2_id = "lookit-jspsych-step2";
    const step3_id = "lookit-jspsych-step3";
    const step_complete_class = "lookit-jspsych-step-complete";
    const step_complete_text = "Done!";
    // info/error messages
    const waiting_for_access_msg = "Waiting for camera/mic access...";
    const checking_mic_msg = "Checking mic input...";
    const access_problem_msg = "There was a problem accessing your media devices.";
    const setup_problem_msg = "There was a problem setting up your camera and mic.";

    /**
     * Function to collect trial data and end the trial. JsPsych.finishTrial
     * takes the plugin's trial data as an argument, ends the trial, and moves
     * on to the next trial in the experiment timeline.
     */
    const endTrial = () => {
      const trial_data = {
        rt: this.response.rt,
        camId: this.camId,
        micId: this.micId,
      };
      this.jsPsych.finishTrial(trial_data);
    };

    /**
     * Function to update the errors/messages div with information for the user
     * about the camera/mic checks.
     *
     * @param errorMsg - Message to display in the error message div.
     *   Pass an empty string to clear any existing errors/messages.
     */
    const updateErrors = (errorMsg: string) => {
      const error_msg_div = display_element.querySelector(
        `#${error_msg_div_id}`,
      ) as HTMLDivElement;
      error_msg_div.innerHTML = errorMsg;
    };

    /**
     * Update the instructions for a given step, based on whether or not the
     * check has passed for that step.
     *
     * @param step - Which instructions step to update. 1 = stream
     *   access, 2 = reload complete, 3 = mic level check.
     * @param checkPassed - Whether or not the mic check has passed.
     */
    const updateInstructions = (step: number, checkPassed: boolean) => {
      // Get the IDs for the elements we need to update.
      let step_id = null;
      switch (step) {
        case 1: {
          step_id = step1_id;
          break;
        }
        case 2: {
          step_id = step2_id;
          break;
        }
        case 3: {
          step_id = step3_id;
          break;
        }
      }
      const step_complete_span = display_element.querySelector(
        `#${step_id}-span`,
      ) as HTMLSpanElement;
      const step_paragraph = display_element.querySelector(
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
     * Function to handle the next button click event.
     */
    const nextButtonClick = () => {
      // Calculate RT and end the trial.
      const end_time = performance.now();
      const rt = Math.round(end_time - start_time);
      this.response.rt = rt;
      endTrial();
    };

    /** 
     * Function to handle the reload recorder button click event. 
     */
    const reloadButtonClick = () => {
      this.hasReloaded = true;
      updateInstructions(2, true);
      destroyRecorder()?.then(setupRecorder);
    };

    /**
     * Function to populate the device selection elements. This is run when the
     * trial loads, and in response to changes to the available devices.
     *
     * @param devices - Object with properties 'cameras' and 'mics', which are
     *   arrays containing lists of available devices.
     * @param devices.cameras - Array of MediaDeviceInfo objects for
     *   webcam/video input devices.
     * @param devices.mics - Array of MediaDeviceInfo objects for mic/audio
     *   input devices.
     */
    const updateDeviceSelection = (devices: {
      cameras: MediaDeviceInfo[];
      mics: MediaDeviceInfo[];
    }) => {
      // Clear any existing options in select elements
      const cam_selection_el = display_element.querySelector(
        `#${camera_selection_id}`,
      ) as HTMLSelectElement;
      cam_selection_el.innerHTML = "";
      const mic_selection_el = display_element.querySelector(
        `#${mic_selection_id}`,
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
     * If there is a change to the available devices, then we need to: (1) get
     * the updated device lists, (2) update the select elements with these list
     * elements.
     */
    navigator.mediaDevices.ondevicechange = () => {
      this.recorder
        ?.getDeviceLists()
        .then(
          (devices: {
            cameras: MediaDeviceInfo[];
            mics: MediaDeviceInfo[];
          }) => {
            updateDeviceSelection(devices);
          },
        );
    };

    /**
     * Takes the selected device IDs from the camera/mic selection elements,
     * gets the streams for these devices, and sets these as the input devices
     * via jsPsych.pluginAPI.initializeMicrophoneRecorder and
     * jsPsych.pluginAPI.initializeCameraRecorder.
     *
     * @returns Promise that resolves with the stream for the selected camera
     *   and mic.
     */
    const setDevices = () => {
      enable_next(false);
      updateInstructions(3, false);
      // Get the devices selected from the drop-down element.
      const selected_cam: string = (
        display_element.querySelector(
          `#${camera_selection_id}`,
        ) as HTMLSelectElement
      ).value;
      this.camId = selected_cam;
      const selected_mic: string = (
        display_element.querySelector(
          `#${mic_selection_id}`,
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
     * Destroy the recorder.
     *
     * @returns Promise that resolves when the recorder has been destroyed and
     *   variables reset to initial values.
     */
    const destroyRecorder = () => {
      return this.recorder?.destroy().then(() => {
        this.recorder = null;
        this.hasCamMicAccess = false;
        enable_next(false);
        updateInstructions(3, false);
        updateInstructions(1, false);
      });
    };

    /**
     * Function to run the stream checks after permissions have been granted and
     * devices have been selected. This is run when the trial first loads, after
     * permissions are granted, and in response to changes to the device
     * selection. It checks for (1) the existence of the required streams, (2)
     * minimum microphone input level (when audio is included), and (3) media
     * permissions (via recorder destroy/reload). This runs the stream checks,
     * updates the info/error messages, enables the next button, and handles
     * errors. This is factored out of the set up process (setupRecorder)
     * because it is also triggered by a change in the cam/mic device
     * selection.
     *
     * @returns Promise that resolves when the stream checks have finished
     *   successfully, the next button has been enabled, info/error messages
     *   updated, and errors handled.
     */
    const runStreamChecks = () => {
      this.hasCamMicAccess = this.recorder
        ? this.recorder.camMicAccess()
        : false;
      if (this.hasCamMicAccess) {
        this.recorder!.insertWebcamFeed(
          display_element.querySelector(
            `#${webcam_container_id}`,
          ) as HTMLDivElement,
        );
        updateInstructions(1, true);
        updateErrors(checking_mic_msg);

        return this.recorder!.checkMic()
          .then(() => {
            updateErrors("");
            updateInstructions(3, true);
            if (this.hasReloaded) {
              enable_next(true);
            }
          })
          .catch((e) => {
            console.warn(`${e}`);
            updateErrors(setup_problem_msg);
            throw new Error(`${e}`);
          });
      } else {
        updateErrors(access_problem_msg);
        throw new Error("NoStreamAccess");
      }
    };

    /**
     * Function to setup the Recorder and run the permissions/mic checks. This
     * is run when the trial first loads and anytime the user clicks the reload
     * recorder button.
     *
     * 1. Setup a new recorder instance.
     * 2. Request permissions, if necessary.
     * 3. Enumerate devices and populate the device selection elements with
     *    options.
     * 4. Setup the recorder with the current/selected devices.
     * 5. Run the stream checks. (If completed successfully, this will clear any
     *    error messages and enable the next button).
     *
     * @returns Promise that resolves when the stream checks have finished
     *   successfully.
     */
    const setupRecorder = () => {
      // Reset step completion states for step 1 (stream access) and 3 (mic check).
      // Don't reset step 2 (reload) because that should persist after being checked once with any Recorder/devices.
      updateInstructions(1, false);
      updateInstructions(3, false);
      updateErrors(waiting_for_access_msg);
      this.recorder = new Recorder(this.jsPsych, "video_config");
      return this.recorder
        .requestPermission({ video: true, audio: true })
        .then(() => {
          updateErrors("");
          return this.recorder!.getDeviceLists();
        })
        .then(
          (devices: {
            cameras: MediaDeviceInfo[];
            mics: MediaDeviceInfo[];
          }) => {
            // Update the device choices listed in the selection elements
            updateDeviceSelection(devices);
            // Get the stream with the selected devices
            // (returns a promise because it requires getUserMedia, and user may need to give permissions again)
            return setDevices();
          },
        )
        .then(runStreamChecks);
    };

    const html_params = { webcam_container_id, reload_button_id_cam, camera_selection_id, mic_selection_id, step1_id, step2_id, step3_id, step_complete_class, step_complete_text, reload_button_id_text, next_button_id };
    display_element.innerHTML = Mustache.render(video_config, html_params);

    // Add event listeners after elements have been added to the page.

    // Next button.
    const next_button_el = display_element.querySelector(
      `#${next_button_id}`,
    ) as HTMLButtonElement;
    next_button_el.addEventListener("click", nextButtonClick);

    // Reload buttons.
    (
      display_element.querySelectorAll(
        `#${reload_button_id_cam}, #${reload_button_id_text}`,
      ) as NodeListOf<HTMLButtonElement>
    ).forEach((el) => el.addEventListener("click", reloadButtonClick));

    // Camera/mic selection elements.
    // If either value changes, then set the current values as the devices and re-run the checks.
    (
      display_element.querySelectorAll(
        ".lookit-jspsych-device-selection",
      ) as NodeListOf<HTMLSelectElement>
    ).forEach((el) => {
      el.addEventListener("change", () => {
        setDevices().then(runStreamChecks);
      });
    });

    /**
     * Function to toggle the next button disable property.
     *
     * @param enable - Whether to enable (true) or disable (false) the
     *   next button.
     */
    const enable_next = (enable: boolean) => {
      if (enable) {
        next_button_el.disabled = false;
        next_button_el.classList.add(`${step_complete_class}`);
      } else {
        next_button_el.disabled = true;
        next_button_el.classList.remove(`${step_complete_class}`);
      }
    };

    // Begin the initial recorder setup steps.
    setupRecorder();

    // Record start time.
    const start_time = performance.now();
  }
}
