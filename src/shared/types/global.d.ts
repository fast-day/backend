export {};

declare global {
  type SuccessResponse = {
    success: boolean;
  };

  type NullableFields<T> = {
    [P in keyof T]: T[P] | null;
  };
}
