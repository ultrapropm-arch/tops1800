import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing Google auth code." },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    return NextResponse.json({
      success: true,
      message: "Copy the refresh_token and add it to .env.local as GOOGLE_REFRESH_TOKEN.",
      tokens,
    });
  } catch (error) {
    console.error("Google callback error:", error);

    return NextResponse.json(
      { success: false, error: "Google callback failed." },
      { status: 500 }
    );
  }
}