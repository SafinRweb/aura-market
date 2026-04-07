import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            return NextResponse.json({ error: "Firebase Admin is not configured on the server" }, { status: 500 });
        }

        const body = await req.json();
        const tokens: string[] = body.tokens;
        const type: string = body.type;
        const messageText: string = body.message;

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ error: "No target FCM tokens provided" }, { status: 400 });
        }
        if (!messageText) {
            return NextResponse.json({ error: "No notification message provided" }, { status: 400 });
        }

        let title = "Aura Market Notification";
        if (type === "match_reminder") title = "⚽ Match Reminder";
        if (type === "daily_reward") title = "✨ Daily Reward";
        if (type === "bet_won") title = "💸 Bet Won!";
        if (type === "bet_lost") title = "💔 Bet Lost";

        const messaging = adminApp.messaging();

        // Dispatch bulk pushes efficiently using FCM multicasat
        const payload = {
            notification: {
                title,
                body: messageText,
            },
            data: {
                type: type,
            },
            tokens: tokens,
        };

        const response = await messaging.sendEachForMulticast(payload);

        return NextResponse.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            failures: response.responses.filter(r => !r.success).map(r => r.error?.message),
        });

    } catch (error) {
        console.error("Failed to send push notifications:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to trigger pushes";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
