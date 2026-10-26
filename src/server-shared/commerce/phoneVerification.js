const { randomBytes, createHash } = require("node:crypto");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function phoneVerification({ db, auth }) {
  return {
    async start(uid, challenge) {
      if (!/^[a-f0-9]{64}$/.test(challenge || ""))
        throw Error("Invalid verification challenge.");
      const code = randomBytes(32).toString("hex"),
        ref = db.doc(`phoneVerificationSessions/${hash(code)}`);
      // A per-account cooldown protects session creation; SMS abuse is also checked by Firebase reCAPTCHA.
      await db.runTransaction(async (tx) => {
        const rate = db.doc(`phoneVerificationLimits/${uid}`),
          previous = await tx.get(rate);
        if ((previous.data()?.last_started_at || 0) > Date.now() - 30000)
          throw Error("Please wait before starting phone verification again.");
        tx.set(rate, { last_started_at: Date.now() });
        tx.set(ref, { uid, challenge, expires_at: Date.now() + 120000 });
      });
      return { code };
    },
    async exchange(code, verifier) {
      if (
        !/^[a-f0-9]{64}$/.test(code || "") ||
        !/^[a-f0-9]{64}$/.test(verifier || "")
      )
        throw Error("Invalid phone verification session.");
      const uid = await db.runTransaction(async (tx) => {
        const ref = db.doc(`phoneVerificationSessions/${hash(code)}`),
          snapshot = await tx.get(ref),
          data = snapshot.data();
        if (
          !data ||
          data.expires_at < Date.now() ||
          data.challenge !== hash(verifier)
        )
          throw Error(
            "Phone verification session expired. Start again from the app.",
          );
        tx.delete(ref);
        return data.uid;
      });
      const user = await auth.getUser(uid);
      if (user.disabled) throw Error("This account is unavailable.");
      return { token: await auth.createCustomToken(uid) };
    },
  };
}
module.exports = { phoneVerification };
