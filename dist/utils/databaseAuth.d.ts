import { AuthenticationState } from "@whiskeysockets/baileys";
export declare function useDatabaseAuthState(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    clearAuth: () => Promise<void>;
}>;
//# sourceMappingURL=databaseAuth.d.ts.map