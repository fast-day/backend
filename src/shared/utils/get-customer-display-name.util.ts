import { getFullName } from "./get-full-name.util";

type Props = {
  firstName: string | null;
  lastName: string | null;
};

export const getCustomerDisplayName = (
  local: Props,
  customer: Props,
): string => {
  return getFullName(
    local.firstName ?? customer.firstName,
    local.lastName ?? customer.lastName,
  );
};
