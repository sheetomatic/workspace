export type TaskPageFilterParams = {
  status?: string;
  assignee?: string;
  overdue?: string;
  doneToday?: string;
  all?: string;
};

export function hasQuickTaskFilter(params: TaskPageFilterParams) {
  return Boolean(
    (params.status && params.status !== "ALL") ||
      params.overdue === "1" ||
      params.doneToday === "1",
  );
}

export function taskFilterLabel(params: TaskPageFilterParams) {
  if (params.doneToday === "1") {
    return "Done today";
  }
  if (params.overdue === "1") {
    return "Overdue";
  }
  if (params.status === "PENDING") {
    return "Pending";
  }
  if (params.status === "IN_PROGRESS") {
    return "In progress";
  }
  if (params.status === "COMPLETED") {
    return "Completed";
  }
  if (params.status === "REVISION_REQUESTED") {
    return "Revision requested";
  }
  if (params.status === "EXTENSION_REQUESTED") {
    return "Extension requested";
  }
  if (params.status === "HELP_REQUESTED") {
    return "Help requested";
  }
  if (params.assignee) {
    return "Filtered by assignee";
  }
  return null;
}
