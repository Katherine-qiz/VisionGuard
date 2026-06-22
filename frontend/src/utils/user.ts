import { readUserProfile } from "./localData";

export function getCurrentUserId() {
    const profile = readUserProfile();
    return profile.userId || profile.username || "demo-user";
}
