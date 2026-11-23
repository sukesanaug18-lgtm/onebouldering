import "server-only";
import { adminAuth } from "@/server/firebase-admin";

// Office staff = Firebase Authentication accounts with the custom claim admin: true.

export type StaffRow = {
  uid: string;
  email: string;
  /** True once the person has set a password (from the setup email). */
  hasPassword: boolean;
  lastSignIn: string;
  created: string;
};

export async function listStaff(): Promise<StaffRow[]> {
  const rows: StaffRow[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth().listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.admin !== true) continue;
      rows.push({
        uid: u.uid,
        email: u.email ?? "",
        hasPassword: u.providerData.some((p) => p.providerId === "password"),
        lastSignIn: u.metadata.lastSignInTime ?? "",
        created: u.metadata.creationTime ?? "",
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return rows.sort((a, b) => a.email.localeCompare(b.email));
}
