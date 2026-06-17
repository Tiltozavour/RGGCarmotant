import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
initializeApp();
const db = getFirestore();
const auth = getAuth();
async function assertAdmin(uid) {
    const adminSnap = await db
        .collection("players")
        .doc(uid)
        .get();
    if (!adminSnap.exists ||
        adminSnap.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "Only admins can reset passwords.");
    }
}
export const resetPlayerPassword = onCall(async (request) => {
    const adminUid = request.auth?.uid;
    if (!adminUid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    await assertAdmin(adminUid);
    const login = String(request.data?.login ?? "")
        .trim()
        .toLowerCase();
    const temporaryPassword = String(request.data?.temporaryPassword ?? "").trim();
    if (!login) {
        throw new HttpsError("invalid-argument", "Player login required.");
    }
    if (temporaryPassword.length < 6) {
        throw new HttpsError("invalid-argument", "Password must contain at least 6 characters.");
    }
    // Ищем UID игрока через invite
    const inviteSnap = await db
        .collection("invites")
        .where("assignedTo", "==", login)
        .where("used", "==", true)
        .limit(1)
        .get();
    if (inviteSnap.empty) {
        throw new HttpsError("not-found", "Player invite not found.");
    }
    const invite = inviteSnap.docs[0].data();
    const playerUid = invite.usedBy;
    if (!playerUid) {
        throw new HttpsError("failed-precondition", "Player UID missing.");
    }
    // Меняем пароль Firebase Auth
    await auth.updateUser(playerUid, {
        password: temporaryPassword
    });
    // Записываем событие
    await db
        .collection("gameEvents")
        .add({
        type: "admin_password_reset",
        adminUid,
        targetPlayerUid: playerUid,
        targetLogin: login,
        timestamp: Date.now(),
        message: `Администратор сбросил пароль игроку ${login}.`
    });
    return {
        ok: true
    };
});
