const { randomBytes, createHash } = require("node:crypto");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const normalizePhone = (value) => {
  let phone = String(value || "").replace(/[\s()-]/g, "");
  if (/^03\d{9}$/.test(phone)) phone = "+92" + phone.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw Error(
      "Enter your WhatsApp number with country code, for example +923001234567.",
    );
  return phone;
};
function whatsappPhoneVerification({ db, auth }) {
  const requestRef = (uid) => db.doc(`whatsappPhoneVerifications/${uid}`);
  return {
    async start(uid, number) {
      const phone = normalizePhone(number),
        user = await auth.getUser(uid);
      if (user.disabled) throw Error("This account is unavailable.");
      if (user.phoneNumber) return { verified: true };
      const code = randomBytes(8).toString("hex").toUpperCase();
      const requestId = randomBytes(12).toString("hex");
      const now = Date.now();
      await db.runTransaction(async (tx) => {
        const ref = requestRef(uid),
          previous = (await tx.get(ref)).data();
        if (
          previous?.status === "verifying" &&
          previous.review_started_at > now - 5 * 60000
        )
          throw Error(
            "Your request is being reviewed. Please refresh shortly.",
          );
        if ((previous?.created_at || 0) > now - 60000)
          throw Error(
            "Please wait a minute before requesting another verification code.",
          );
        tx.set(ref, {
          uid,
          request_id: requestId,
          phone,
          code_hash: digest(code),
          status: "pending",
          attempts: 0,
          name: user.displayName || "",
          email: user.email || "",
          created_at: now,
          expires_at: now + 15 * 60000,
          pending_until: now + 15 * 60000,
        });
      });
      return {
        request_id: requestId,
        uid,
        phone,
        code,
        expires_at: now + 15 * 60000,
      };
    },
    async approve(uid, input, admin) {
      // This is an administrator attestation of the actual WhatsApp sender, never a customer self-assertion.
      if (admin?.role !== "admin" || !admin.uid)
        throw Error("Only administrators can verify WhatsApp ownership.");
      if (input.sender_confirmed !== true)
        throw Error(
          "Check the actual WhatsApp sender before confirming ownership.",
        );
      const sender = normalizePhone(input.sender_phone);
      const code = String(input.code || "")
        .replace(/[\s-]/g, "")
        .toUpperCase();
      const approvalId = randomBytes(12).toString("hex");
      const result = await db.runTransaction(async (tx) => {
        const ref = requestRef(uid),
          record = (await tx.get(ref)).data();
        if (
          !record ||
          record.request_id !== input.request_id ||
          record.status !== "pending" ||
          record.expires_at < Date.now()
        )
          return {
            error:
              "Request expired or unavailable. Ask the customer to request a new code.",
          };
        if (record.attempts >= 5)
          return {
            error: "Too many attempts. Ask the customer to request a new code.",
          };
        if (record.phone !== sender || digest(code) !== record.code_hash) {
          tx.update(ref, { attempts: record.attempts + 1 });
          return {
            error:
              "The code or actual WhatsApp sender does not match this request.",
          };
        }
        const auditRef = db.doc(`rewardAudit/phone-${approvalId}`);
        tx.set(ref, {
          ...record,
          status: "verifying",
          pending_until: 0,
          approval_id: approvalId,
          reviewed_by: admin.uid,
          review_started_at: Date.now(),
        });
        tx.create(auditRef, {
          action: "phone_verification_attested",
          customer_uid: uid,
          by: admin.uid,
          phone: sender,
          method: "whatsapp_staff",
          at: new Date().toISOString(),
          request_id: record.request_id,
        });
        return { phone: record.phone, request_id: record.request_id };
      });
      if (result.error) throw Error(result.error);
      try {
        const user = await auth.getUser(uid);
        if (
          user.disabled ||
          (user.phoneNumber && user.phoneNumber !== result.phone)
        )
          throw Error(
            "This account is unavailable or already verified with another phone.",
          );
        if (!user.phoneNumber)
          await auth.updateUser(uid, { phoneNumber: result.phone });
        await db.runTransaction(async (tx) => {
          const ref = requestRef(uid),
            record = (await tx.get(ref)).data();
          if (record?.approval_id !== approvalId)
            throw Error("Request changed during verification.");
          tx.update(ref, {
            status: "verified",
            verified_at: Date.now(),
            code_hash: "",
          });
          tx.set(
            db.doc(`rewardAudit/phone-${approvalId}`),
            {
              action: "phone_verified",
              completed_at: new Date().toISOString(),
            },
            { merge: true },
          );
        });
        return { verified: true };
      } catch (error) {
        // A failed Auth write can be retried using the same unexpired code. The attestation remains audited.
        await db.runTransaction(async (tx) => {
          const ref = requestRef(uid),
            record = (await tx.get(ref)).data();
          if (
            record?.approval_id === approvalId &&
            record.status === "verifying"
          )
            tx.update(ref, {
              status: "pending",
              pending_until: record.expires_at,
            });
        });
        throw Error(
          error?.code === "auth/phone-number-already-exists"
            ? "This phone is linked to another account. Use the existing account."
            : "Verification could not finish. Refresh and retry; no welcome reward was issued.",
        );
      }
    },
  };
}
module.exports = { whatsappPhoneVerification, normalizePhone };
