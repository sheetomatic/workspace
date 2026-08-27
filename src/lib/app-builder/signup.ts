import { isTeamSizeOption } from "@/lib/geo/constants";
import { isValidPlaceName } from "@/lib/geo/normalize";
import { hasValidLeadEmail, leadPhoneDigits } from "@/lib/leads/contact-validation";

export type AppBuilderSignupInput = {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  teamSize: string;
  industry: string;
  countryId: string;
  stateId: string;
  cityId: string;
};

export type AppBuilderSignupError = { field?: string; message: string };

export function validateAppBuilderSignup(
  input: AppBuilderSignupInput,
): AppBuilderSignupError | null {
  if (!input.name.trim() || input.name.trim().length < 2) {
    return { field: "name", message: "Enter your name." };
  }
  if (!input.businessName.trim()) {
    return { field: "businessName", message: "Enter your business name." };
  }
  if (!hasValidLeadEmail(input.email)) {
    return { field: "email", message: "Enter a valid email." };
  }
  if (!leadPhoneDigits(input.phone)) {
    return { field: "phone", message: "Enter a 10-digit mobile so we can call you." };
  }
  if (input.password.length < 8) {
    return { field: "password", message: "Password must be at least 8 characters." };
  }
  if (input.password !== input.confirmPassword) {
    return { field: "confirmPassword", message: "Passwords do not match." };
  }
  if (!isTeamSizeOption(input.teamSize)) {
    return { field: "teamSize", message: "Pick your team size." };
  }
  if (!isValidPlaceName(input.industry)) {
    return { field: "industry", message: "Pick or add your business / industry." };
  }
  if (!input.countryId.trim()) {
    return { field: "countryId", message: "Pick or add your country." };
  }
  if (!input.stateId.trim()) {
    return { field: "stateId", message: "Pick or add your state." };
  }
  if (!input.cityId.trim()) {
    return { field: "cityId", message: "Pick or add your city." };
  }
  return null;
}
