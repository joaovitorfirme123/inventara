export type ClearOrganizationState = {
  status: "idle" | "success" | "error";
  message: string;
  counts: {
    products: number;
    imports: number;
    stockHistory: number;
  } | null;
};
