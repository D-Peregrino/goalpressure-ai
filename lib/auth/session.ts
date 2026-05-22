export const AUTH_COOKIE = "gp_auth_session";
export const DEV_USER_COOKIE = "gp_dev_user_id";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

export type AccountPayload = {
  user: SessionUser;
  plan: "free" | "fundador" | "pro" | "elite";
  subscriptionStatus: string;
  couponCode: string | null;
};
