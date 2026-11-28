/* global __VERSION__, __SUPPORT_DF_VERSION__, __COMMIT_HASH__ */

export const version = __VERSION__
export const build = __COMMIT_HASH__
export const supportDFVersion = __SUPPORT_DF_VERSION__

export enum Action {
  DesignateMine = 1,
  RemoveDesignation,

  DesignateDig,
  DesignateRamp,
  DesignateChannel,
  DesignateStairs,

  Label,
  EraseLabelArea,
  PickLabelOfHotkey,

  Build,

  GFMacro,
  PickGFMacroStartPoint,
  SaveGFMacro,

  Select,
  Character,
  Memo,
}

export enum DrawMode {
  Rectangle = 1,
  Free,
}

export enum DrawRectStage {
  StandBy = 1,
  Drawing,
}

export enum Modals {
  None,
  GenDFMacro,
  ResizeTilemap,
  ShowUsefulHotkeys,
  DownloadFort,
  About,
}
