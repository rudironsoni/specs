import './Adapters/RestApi/registerAdapters.js';

/**
 * Clean-room recreation of the specs-from-figma public API.
 *
 * PUBLIC API
 * - Components.fromRestApi(ids, json, config, foundations, onProgress)
 * - ComponentsData, ProgressEvent
 * - StylesMap, VariablesMap, CollectionsMap
 */
export { Components } from './Components/Components.js';
export { Component } from './Component/Component.js';
export type { ComponentsData, ProgressEvent, RestFoundations } from './Components/Components.js';
export type { StylesMap, VariablesMap, CollectionsMap } from './Runtime/Foundations/FigmaRESTMaps.js';
export { fetchImageFills, resolveImages, resolveComponentImages } from './Images/resolveImages.js';
export { ProgressCoordinator } from './Progress/ProgressCoordinator.js';
export { PHASE_NAMES } from './Progress/Progress.js';
export { buildPhaseConfiguration } from './Progress/PhaseConfiguration.js';
export type { PhaseConfiguration } from './Progress/PhaseConfiguration.js';
export { BINDING_KEY_MAP } from './Constants/BindingKeys.js';
export { REST_TEXT_PROPERTIES, FONT_NAME_MEMBER_MAP } from './Constants/ApiMappings.js';
export { DEV_SETTINGS } from './Constants/DevSettings.js';
export { isReferenceValue } from './Utilities/types.ReferenceValue.js';
export type { ReferenceValue } from './Utilities/types.ReferenceValue.js';
export { SlotContent } from './Component/SlotContent/SlotContent.js';
export { InstanceExample } from './Component/InstanceExamples/InstanceExample.js';
export { PropConfigurations } from './Component/PropConfigurations/PropConfigurations.js';
export type { ProgressState, ProgressCallback } from './Progress/Progress.js';
export { DEFAULT_SETTINGS } from './Config/types.Settings.js';
export type { Settings } from './Config/types.Settings.js';
export { configFromSettings } from './Config/fromSettings.js';
export { RestTextNode } from './Adapters/RestApi/RestTextNode.js';
export { Subcomponent } from './Component/Subcomponents/Subcomponent.js';
export { Layout } from './Component/Layout/Layout.js';
export { FigmaPluginNodes } from './Runtime/Nodes/FigmaPluginNodes.js';
export { FigmaPluginFoundations } from './Runtime/Foundations/FigmaPluginFoundations.js';
export { FigmaRestNodes } from './Runtime/Nodes/FigmaRestNodes.js';
export { FigmaRESTDataResolver } from './Runtime/Foundations/FigmaRESTFoundations.js';
