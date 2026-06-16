export function getCurrentUserId() {
    return localStorage.getItem("visionguard_user_id")
        || localStorage.getItem("visionguard_username")
        || "demo-user";
}
