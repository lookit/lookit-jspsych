import { flushPromises } from "@jspsych/test-utils";
import { JsPsych, TrialType } from "jspsych";

import { ParameterInfos } from "jspsych/src/modules/plugins";
import {
  SimulationMode,
  SimulationOptions,
  TrialResult,
} from "jspsych/src/timeline";
import { PromiseWrapper } from "jspsych/src/timeline/util";
import { ChsJsPsychPlugin } from "../src/types";

// Test Plugin copied from jspsych/tests/TestPlugin and modified to include chsData() as a static method.
// TO DO: Submit PR for exposing the TestPlugin via jsPsych so that we can import it.

export const testPluginInfo = <const>{
  name: "test",
  version: "0.0.1",
  parameters: {},
  data: {},
};

/** Test plugin */
class TestPlugin implements ChsJsPsychPlugin<typeof testPluginInfo> {
  public static info = testPluginInfo;

  /**
   * Set parameter info for this plugin.
   *
   * @param parameters - Parameters to be used for the test plugin info.
   */
  public static setParameterInfos(parameters: ParameterInfos) {
    TestPlugin.info = { ...testPluginInfo, parameters };
  }

  /** Resets the plugin info. */
  public static resetPluginInfo() {
    TestPlugin.info = testPluginInfo;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static defaultTrialResult: Record<string, any> = { my: "result" };

  private static finishTrialMode: "immediate" | "manual" = "immediate";

  /**
   * Disables immediate finishing of the `trial` method of all `TestPlugin`
   * instances. Instead, any running trial can be finished by invoking
   * `TestPlugin.finishTrial()`.
   */
  public static setManualFinishTrialMode() {
    TestPlugin.finishTrialMode = "manual";
  }

  /**
   * Makes the `trial` method of all instances of `TestPlugin` finish
   * immediately and allows to manually finish the trial by invoking
   * `TestPlugin.finishTrial()` instead.
   */
  public static setImmediateFinishTrialMode() {
    TestPlugin.finishTrialMode = "immediate";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static trialPromise = new PromiseWrapper<Record<string, any>>();

  /**
   * Resolves the promise returned by `trial()` with the provided `result` or
   * `TestPlugin.defaultTrialResult` if no `result` object was passed.
   *
   * @param result - Object with key/values to be added as the the data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static async finishTrial(result?: Record<string, any>) {
    TestPlugin.trialPromise.resolve(result ?? TestPlugin.defaultTrialResult);
    await flushPromises();
  }

  /**
   * Provides a default trial implementation.
   *
   * @param display_element - HTML element that holds the jsPsych experiment
   * @param trial - Trial
   * @param on_load - On load function
   * @returns Promise that resolves with trial result.
   */
  public static defaultTrialImplementation(
    display_element: HTMLElement,
    trial: TrialType<typeof testPluginInfo>,
    on_load: () => void,
  ): void | Promise<TrialResult | void> {
    on_load();
    if (TestPlugin.finishTrialMode === "immediate") {
      return Promise.resolve(TestPlugin.defaultTrialResult);
    }
    return TestPlugin.trialPromise.get();
  }

  public static trial = TestPlugin.defaultTrialImplementation;

  /**
   * Default implementation of the plugin's simulate function.
   *
   * @param trial - Trial object
   * @param simulation_mode - "visual" or "data-only"
   * @param simulation_options - Object with options for data, mode, and
   *   simulate
   * @param on_load - On load callback function
   * @returns Default trial implementation
   */
  public static defaultSimulateImplementation(
    trial: TrialType<typeof testPluginInfo>,
    simulation_mode: SimulationMode,
    simulation_options: SimulationOptions,
    on_load?: () => void,
  ): void | Promise<void | TrialResult> {
    return TestPlugin.defaultTrialImplementation(
      document.createElement("div"),
      trial,
      on_load as () => void,
    );
  }

  public static simulate = TestPlugin.defaultSimulateImplementation;

  /** Resets all static properties including function implementations */
  public static reset() {
    TestPlugin.defaultTrialResult = { my: "result" };
    TestPlugin.trial = TestPlugin.defaultTrialImplementation;
    TestPlugin.simulate = TestPlugin.defaultSimulateImplementation;
    TestPlugin.resetPluginInfo();
    TestPlugin.setImmediateFinishTrialMode();
  }

  /**
   * Test plugin constructor.
   *
   * @param jsPsych - JsPsych instance
   */
  public constructor(private jsPsych: JsPsych) {}

  public trial = jest.fn(TestPlugin.trial);
  public simulate = jest.fn(TestPlugin.simulate);

  /**
   * Method added to CHS jsPsych plugins for automatically adding custom data to
   * response.
   *
   * @returns Data object added by TestPlugin. This is added to the data from
   *   all TestPlugin trials (via lookitInitJsPsych).
   */
  public static chsData() {
    return { chs_type: "test" };
  }
}

export default TestPlugin;
