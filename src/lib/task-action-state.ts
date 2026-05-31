export type TaskActionState = {
  ok: boolean;
  message: string;
};

export const taskActionInitialState: TaskActionState = {
  ok: false,
  message: "",
};
