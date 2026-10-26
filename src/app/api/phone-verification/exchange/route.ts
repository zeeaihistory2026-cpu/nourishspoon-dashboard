import { z } from "zod";
import {
  assertSameOrigin,
  authErrorResponse,
  AuthError,
} from "@/lib/auth-server";
import { exchangePhoneVerification } from "@/lib/phone-verification";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = z
      .object({
        code: z.string().regex(/^[a-f0-9]{64}$/),
        verifier: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(await request.json());
    let result;
    try {
      result = await exchangePhoneVerification(input.code, input.verifier);
    } catch {
      throw new AuthError(
        400,
        "Phone verification session expired or is invalid. Start again from the app.",
      );
    }
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
