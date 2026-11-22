// Feature flags: build-time environment variables named VITE_FF_<SCREEN>, on only when "true".
// Each screen issue builds its screen behind its flag; remove a flag once its screen ships.

/** The Tasks screen (/). Off unless VITE_FF_TASKS is "true". */
export function isTasksEnabled(): boolean {
  return import.meta.env.VITE_FF_TASKS === 'true';
}

/** The Task screen (/tasks/$id). Off unless VITE_FF_TASK is "true". */
export function isTaskEnabled(): boolean {
  return import.meta.env.VITE_FF_TASK === 'true';
}

/** The Summary screen (/summary). Off unless VITE_FF_SUMMARY is "true". */
export function isSummaryEnabled(): boolean {
  return import.meta.env.VITE_FF_SUMMARY === 'true';
}
