export type InvitationActionState = {
  status: "idle" | "success" | "error";
  message: string;
  token: string | null;
};
