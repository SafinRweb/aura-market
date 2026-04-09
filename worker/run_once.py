import os
import json
import requests
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
FOOTBALL_API_KEY = os.getenv("FOOTBALL_API_KEY")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Firebase setup
firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    if FIREBASE_SA_JSON:
        sa_dict = json.loads(FIREBASE_SA_JSON)
        cred = credentials.Certificate(sa_dict)
        firebase_admin.initialize_app(cred)
        firebase_initialized = True
        log.info("✅ Firebase initialized")
except Exception as e:
    log.warning(f"⚠️ Firebase init failed: {e}")


def heartbeat():
    try:
        supabase.table("worker_heartbeat").upsert({
            "id": 1,
            "last_alive": datetime.now(timezone.utc).isoformat(),
            "status": "running"
        }).execute()
        log.info("💓 Heartbeat OK")
    except Exception as e:
        log.error(f"Heartbeat failed: {e}")


def warden():
    log.info("🔒 WARDEN running...")
    now = datetime.now(timezone.utc)
    upcoming = supabase.table("matches")\
        .select("*")\
        .eq("status", "upcoming")\
        .execute()
    if not upcoming.data:
        return
    for match in upcoming.data:
        kickoff_str = match.get("kickoff_time")
        if not kickoff_str:
            continue
        try:
            kickoff = datetime.fromisoformat(
                kickoff_str.replace("Z", "+00:00")
            )
            if now >= kickoff:
                supabase.table("matches").update({
                    "status": "live"
                }).eq("id", match["id"]).execute()
                log.info(f"🔒 LOCKED: {match['home_team']} vs {match['away_team']}")
        except Exception as e:
            log.error(f"Warden error: {e}")


def fetcher():
    log.info("🔄 FETCHER running...")
    live = supabase.table("matches")\
        .select("*")\
        .eq("status", "live")\
        .execute()
    if not live.data:
        log.info("No live matches right now")
        return
    for match in live.data:
        api_id = match.get("api_match_id")
        if not api_id:
            continue
        try:
            res = requests.get(
                f"https://api.football-data.org/v4/matches/{api_id}",
                headers={"X-Auth-Token": FOOTBALL_API_KEY},
                timeout=10
            )
            if res.status_code != 200:
                continue
            data = res.json()
            score = data.get("score", {})
            full_time = score.get("fullTime", {})
            home_score = full_time.get("home") or 0
            away_score = full_time.get("away") or 0
            api_status = data.get("status", "")

            if api_status in ["FINISHED", "AWARDED"]:
                new_status = "finished"
            elif api_status in ["IN_PLAY", "PAUSED", "HALFTIME"]:
                new_status = "live"
            else:
                new_status = match["status"]

            supabase.table("matches").update({
                "home_score": home_score,
                "away_score": away_score,
                "status": new_status,
            }).eq("id", match["id"]).execute()

            log.info(
                f"Updated: {match['home_team']} {home_score}-{away_score} "
                f"{match['away_team']} [{new_status}]"
            )

            if new_status == "finished" and match["status"] != "finished":
                accountant(match["id"])

        except Exception as e:
            log.error(f"Fetcher error: {e}")


def get_correct_outcomes(match: dict) -> dict:
    home_score = match["home_score"]
    away_score = match["away_score"]
    total_goals = home_score + away_score
    outcomes = {}
    if home_score > away_score:
        outcomes["match_winner"] = "home"
    elif away_score > home_score:
        outcomes["match_winner"] = "away"
    else:
        outcomes["match_winner"] = "draw"
    outcomes["over_under"] = "over" if total_goals > 2 else "under"
    outcomes["btts"] = "yes" if home_score > 0 and away_score > 0 else "no"
    outcomes["first_scorer"] = None
    return outcomes


def void_bet(bet: dict):
    supabase.table("bets").update({
        "status": "void",
        "actual_payout": bet["stake"],
    }).eq("id", bet["id"]).execute()
    user_res = supabase.table("users")\
        .select("aura_balance")\
        .eq("id", bet["user_id"])\
        .single()\
        .execute()
    if user_res.data:
        supabase.table("users").update({
            "aura_balance": user_res.data["aura_balance"] + bet["stake"]
        }).eq("id", bet["user_id"]).execute()
    send_notification(
        user_id=bet["user_id"],
        notif_type="bet_void",
        message=f"Bet voided — stake refunded · {bet['stake']} 🤫",
        aura_change=0,
    )
def pay_referral_commission(user_id: str, profit: int):
    if profit <= 0:
        return

    try:
        # Check if this user was referred by someone
        user_res = supabase.table("users")\
            .select("referred_by, username")\
            .eq("id", user_id)\
            .single()\
            .execute()

        if not user_res.data or not user_res.data.get("referred_by"):
            return

        referrer_id = user_res.data["referred_by"]
        referred_username = user_res.data["username"]

        # Calculate 10% commission
        commission = max(1, int(profit * 0.10))

        # Get referrer balance
        referrer_res = supabase.table("users")\
            .select("aura_balance, referral_earnings")\
            .eq("id", referrer_id)\
            .single()\
            .execute()

        if not referrer_res.data:
            return

        r = referrer_res.data

        # Pay commission
        supabase.table("users").update({
            "aura_balance": r["aura_balance"] + commission,
            "referral_earnings": (r.get("referral_earnings") or 0) + commission,
        }).eq("id", referrer_id).execute()

        # Update referral record
        supabase.table("referrals")\
            .update({"total_commission": supabase.table("referrals")
                .select("total_commission")
                .eq("referrer_id", referrer_id)
                .eq("referred_id", user_id)
                .execute().data[0]["total_commission"] + commission
            })\
            .eq("referrer_id", referrer_id)\
            .eq("referred_id", user_id)\
            .execute()

        # Notify referrer
        send_notification(
            user_id=referrer_id,
            notif_type="bet_won",
            message=f"💸 {referred_username} won a bet — you earned {commission} 🤫 commission!",
            aura_change=commission,
        )

        log.info(f"Referral commission: {commission} paid to {referrer_id}")

    except Exception as e:
        log.error(f"Referral commission error: {e}")


def pay_first_bet_bonus(user_id: str, referrer_id: str):
    try:
        # Check if first bet bonus already paid
        ref_res = supabase.table("referrals")\
            .select("first_bet_bonus_paid")\
            .eq("referrer_id", referrer_id)\
            .eq("referred_id", user_id)\
            .single()\
            .execute()

        if not ref_res.data or ref_res.data["first_bet_bonus_paid"]:
            return

        # Pay 50 🤫 bonus to referrer
        referrer_res = supabase.table("users")\
            .select("aura_balance, referral_earnings")\
            .eq("id", referrer_id)\
            .single()\
            .execute()

        if not referrer_res.data:
            return

        r = referrer_res.data
        supabase.table("users").update({
            "aura_balance": r["aura_balance"] + 50,
            "referral_earnings": (r.get("referral_earnings") or 0) + 50,
        }).eq("id", referrer_id).execute()

        # Mark bonus as paid
        supabase.table("referrals").update({
            "first_bet_bonus_paid": True,
        }).eq("referrer_id", referrer_id)\
          .eq("referred_id", user_id)\
          .execute()

        # Get referred username
        user_res = supabase.table("users")\
            .select("username")\
            .eq("id", user_id)\
            .single()\
            .execute()

        username = user_res.data["username"] if user_res.data else "your referral"

        send_notification(
            user_id=referrer_id,
            notif_type="daily_reward",
            message=f"🎉 {username} placed their first bet! You earned 50 🤫 bonus!",
            aura_change=50,
        )

        log.info(f"First bet bonus paid to {referrer_id}")

    except Exception as e:
        log.error(f"First bet bonus error: {e}")

def accountant(match_id: str):
    log.info(f"💰 ACCOUNTANT processing {match_id}...")
    try:
        match_res = supabase.table("matches")\
            .select("*")\
            .eq("id", match_id)\
            .single()\
            .execute()
        match = match_res.data
        if not match:
            return
        home = match["home_team"]
        away = match["away_team"]
        correct_outcomes = get_correct_outcomes(match)
        bets_res = supabase.table("bets")\
            .select("*")\
            .eq("match_id", match_id)\
            .eq("status", "pending")\
            .execute()
        if not bets_res.data:
            log.info("No pending bets")
            return
        bets = bets_res.data
        markets = ["match_winner", "over_under", "btts", "first_scorer"]
        for market in markets:
            market_bets = [b for b in bets if b["market_type"] == market]
            if not market_bets:
                continue
            correct = correct_outcomes.get(market)
            if correct is None:
                for bet in market_bets:
                    void_bet(bet)
                continue
            winners = [b for b in market_bets if b["outcome"] == correct]
            losers = [b for b in market_bets if b["outcome"] != correct]
            total_pool = sum(b["stake"] for b in market_bets)
            winning_pool = sum(b["stake"] for b in winners)
            for bet in winners:
                payout = int((bet["stake"] / winning_pool) * total_pool) if winning_pool > 0 else bet["stake"]
                profit = payout - bet["stake"]
                supabase.table("bets").update({
                    "status": "won",
                    "actual_payout": payout,
                }).eq("id", bet["id"]).execute()
                user_res = supabase.table("users")\
                    .select("aura_balance, total_gained, biggest_win, win_count")\
                    .eq("id", bet["user_id"])\
                    .single()\
                    .execute()
                if user_res.data:
                    u = user_res.data
                    supabase.table("users").update({
                        "aura_balance": u["aura_balance"] + payout,
                        "total_gained": u["total_gained"] + profit,
                        "biggest_win": max(u["biggest_win"], profit),
                        "win_count": u["win_count"] + 1,
                    }).eq("id", bet["user_id"]).execute()

                    send_notification(
                        user_id=bet["user_id"],
                        notif_type="bet_won",
                        message=f"You won! {home} vs {away} · +{payout} 🤫",
                        aura_change=profit,
                    )
                    log.info(f"Paid {payout} to {bet['user_id']}")

                    # ── REFERRAL COMMISSION ──────────────────────────────
                    pay_referral_commission(bet["user_id"], profit)

            # Check first bet bonus for winners
            for bet in winners:
                user_check = supabase.table("users")\
                    .select("referred_by, total_bets")\
                    .eq("id", bet["user_id"])\
                    .single()\
                    .execute()

                if user_check.data and user_check.data.get("referred_by"):
                    if user_check.data.get("total_bets") == 1:
                        pay_first_bet_bonus(
                            bet["user_id"],
                            user_check.data["referred_by"]
                        )

            for bet in losers:
                supabase.table("bets").update({
                    "status": "lost",
                    "actual_payout": 0,
                }).eq("id", bet["id"]).execute()
                send_notification(
                    user_id=bet["user_id"],
                    notif_type="bet_lost",
                    message=f"Unlucky! {home} vs {away} · -{bet['stake']} 🤫",
                    aura_change=-bet["stake"],
                )
        log.info(f"✅ Accountant done for {home} vs {away}")
    except Exception as e:
        log.error(f"Accountant error: {e}")


def notifier():
    log.info("🔔 NOTIFIER running...")
    now = datetime.now(timezone.utc)
    thirty_mins_later = now + timedelta(minutes=30)
    thirty_five_mins_later = now + timedelta(minutes=35)
    upcoming = supabase.table("matches")\
        .select("*")\
        .eq("status", "upcoming")\
        .execute()
    if not upcoming.data:
        return
    for match in upcoming.data:
        kickoff_str = match.get("kickoff_time")
        if not kickoff_str:
            continue
        try:
            kickoff = datetime.fromisoformat(
                kickoff_str.replace("Z", "+00:00")
            )
            if thirty_mins_later <= kickoff <= thirty_five_mins_later:
                send_match_reminders(match)
        except Exception as e:
            log.error(f"Notifier error: {e}")


def send_match_reminders(match: dict):
    log.info(f"Sending reminders for {match['home_team']} vs {match['away_team']}")
    users_res = supabase.table("users")\
        .select("id, fcm_token")\
        .eq("push_enabled", True)\
        .execute()
    if not users_res.data:
        return
    home = match["home_team"]
    away = match["away_team"]
    home_flag = match.get("home_flag", "")
    away_flag = match.get("away_flag", "")
    for user in users_res.data:
        if not user.get("fcm_token"):
            continue
        send_notification(
            user_id=user["id"],
            notif_type="match_reminder",
            message=f"⚽ KICKOFF IN 30 MINS · {home_flag} {home} vs {away} {away_flag}",
            aura_change=0,
        )
        if firebase_initialized and user.get("fcm_token"):
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title="⚽ Match Starting Soon!",
                        body=f"{home_flag} {home} vs {away} {away_flag} — 30 mins!",
                    ),
                    token=user["fcm_token"],
                    data={"match_id": match["id"], "type": "match_reminder"}
                )
                messaging.send(message)
            except Exception as e:
                log.error(f"Push failed: {e}")


def send_notification(user_id, notif_type, message, aura_change):
    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "type": notif_type,
            "message": message,
            "aura_change": aura_change,
            "is_read": False,
        }).execute()
    except Exception as e:
        log.error(f"Notification failed: {e}")


if __name__ == "__main__":
    log.info("🤫 Aura Market Worker — single run")
    heartbeat()
    warden()
    fetcher()
    notifier()
    log.info("✅ Done")