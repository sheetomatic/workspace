export type PasswordActionState = {
  ok: boolean;
  message: string;
};

export const passwordActionInitialState: PasswordActionState = {
  ok: false,
  message: "",
};
