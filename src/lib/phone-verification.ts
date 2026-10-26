import "server-only";
import { phoneVerification } from "../server-shared/commerce/phoneVerification.js";
import { adminAuth, adminDb } from "./firebase-admin";
import { whatsappPhoneVerification } from "../server-shared/commerce/whatsappPhoneVerification.js";
export const whatsappPhoneService = () =>
  whatsappPhoneVerification({ db: adminDb(), auth: adminAuth() });
export function exchangePhoneVerification(code: string, verifier: string) {
  return phoneVerification({ db: adminDb(), auth: adminAuth() }).exchange(
    code,
    verifier,
  );
}
