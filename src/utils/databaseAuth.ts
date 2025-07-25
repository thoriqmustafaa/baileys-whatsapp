import { AuthenticationState, initAuthCreds } from "@whiskeysockets/baileys";
import { DatabaseService } from "@/services/database";

// Global map to track save operations per session to prevent race conditions
const savingOperations = new Map<string, Promise<void>>();

// Cleanup function to remove stale operations (optional)
const cleanupSaveOperations = () => {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds

  for (const [sessionId, operation] of savingOperations.entries()) {
    // Check if operation is still pending after threshold
    Promise.race([
      operation,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), staleThreshold)
      ),
    ]).catch(() => {
      console.warn(`[${sessionId}] Removing stale save operation`);
      savingOperations.delete(sessionId);
    });
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupSaveOperations, 5 * 60 * 1000);

/**
 * Serialize data to JSON with binary support
 */
function serializeData(data: any): string {
  try {
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Uint8Array) {
        return {
          __type: "Uint8Array",
          data: Array.from(value),
        };
      }
      if (value instanceof Buffer) {
        return {
          __type: "Buffer",
          data: Array.from(value),
        };
      }
      if (value && typeof value === "object" && value.type === "Buffer") {
        return {
          __type: "Buffer",
          data: value.data,
        };
      }
      return value;
    });
  } catch (error) {
    console.error("Error serializing data:", error);
    return "{}";
  }
}

/**
 * Deserialize JSON data with binary support
 */
function deserializeData(jsonString: string): any {
  try {
    return JSON.parse(jsonString, (key, value) => {
      if (value && typeof value === "object" && value.__type) {
        if (value.__type === "Uint8Array") {
          return new Uint8Array(value.data);
        }
        if (value.__type === "Buffer") {
          return Buffer.from(value.data);
        }
      }
      return value;
    });
  } catch (error) {
    console.error("Error deserializing data:", error);
    return {};
  }
}

/**
 * Database-based authentication state for WhatsApp
 * Replaces file system storage with database storage
 */
export async function useDatabaseAuthState(sessionId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAuth: () => Promise<void>;
}> {
  // Initialize with default credentials
  let creds = initAuthCreds();
  const keys: any = {};

  // Load existing auth data from database
  const authDataList = await DatabaseService.getAuthData(sessionId);

  console.log(
    `[${sessionId}] Loading auth data from database, found ${authDataList.length} entries`
  );

  // Parse credentials
  const credsData = authDataList.find((data) => data.key === "creds.json");
  if (credsData) {
    try {
      const parsedCreds = deserializeData(credsData.value);
      // Validate credentials structure
      if (
        parsedCreds &&
        typeof parsedCreds === "object" &&
        parsedCreds.noiseKey
      ) {
        creds = parsedCreds;
        console.log(`[${sessionId}] Loaded valid credentials from database`);
      } else {
        console.log(
          `[${sessionId}] Invalid credentials structure, using defaults`
        );
        creds = initAuthCreds();
      }
    } catch (error) {
      console.error(`[${sessionId}] Error parsing credentials:`, error);
      creds = initAuthCreds();
    }
  }

  // Parse keys
  authDataList.forEach((data) => {
    if (data.key !== "creds.json") {
      try {
        const keyData = deserializeData(data.value);
        const keyType = getKeyTypeFromFileName(data.key);
        if (keyType && keyData && typeof keyData === "object") {
          keys[keyType] = keyData;
          console.log(`[${sessionId}] Loaded key type: ${keyType}`);
        }
      } catch (error) {
        console.error(
          `[${sessionId}] Error parsing key data ${data.key}:`,
          error
        );
      }
    }
  });

  const state: AuthenticationState = {
    creds,
    keys: {
      get: (type, ids) => {
        const key = keys[type];
        if (!key) return {};

        return ids.reduce((dict, id) => {
          const value = key[id];
          if (value) {
            dict[id] = value;
          }
          return dict;
        }, {} as any);
      },
      set: (data: any) => {
        for (const type in data) {
          keys[type] = keys[type] || {};
          Object.assign(keys[type], data[type]);
        }
      },
    },
  };

  const saveCreds = async () => {
    // Check if there's already a save operation in progress for this session
    if (savingOperations.has(sessionId)) {
      console.log(
        `[${sessionId}] Save operation already in progress, waiting...`
      );
      await savingOperations.get(sessionId);
      return;
    }

    // Create a new save operation promise
    const saveOperation = (async () => {
      try {
        console.log(`[${sessionId}] Saving credentials to database`);

        // Collect all auth data to save
        const authDataToSave = [];

        // Add credentials
        authDataToSave.push({
          key: "creds.json",
          value: serializeData(creds),
        });

        // Add keys
        for (const keyType in keys) {
          const keyData = keys[keyType];
          if (
            keyData &&
            typeof keyData === "object" &&
            Object.keys(keyData).length > 0
          ) {
            authDataToSave.push({
              key: `${keyType}.json`,
              value: serializeData(keyData),
            });
          }
        }

        // Save all auth data sequentially
        for (const authItem of authDataToSave) {
          await DatabaseService.saveAuthData(
            sessionId,
            authItem.key,
            authItem.value
          );
          console.log(`[${sessionId}] Saved key: ${authItem.key}`);
          // Small delay to prevent overwhelming the database
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        console.log(`[${sessionId}] All credentials saved successfully`);
      } catch (error) {
        console.error(`[${sessionId}] Error saving credentials:`, error);
        throw error;
      } finally {
        // Remove the operation from the map when done
        savingOperations.delete(sessionId);
      }
    })();

    // Store the operation in the map
    savingOperations.set(sessionId, saveOperation);

    // Wait for the operation to complete
    await saveOperation;
  };

  const clearAuth = async () => {
    try {
      console.log(`[${sessionId}] Clearing auth data from database`);
      await DatabaseService.clearAuthData(sessionId);
    } catch (error) {
      console.error(`[${sessionId}] Error clearing auth data:`, error);
    }
  };

  return {
    state,
    saveCreds,
    clearAuth,
  };
}

/**
 * Get key type from file name
 */
function getKeyTypeFromFileName(fileName: string): string | null {
  const keyTypeMap: { [key: string]: string } = {
    "app-state-sync-key.json": "app-state-sync-key",
    "app-state-sync-version.json": "app-state-sync-version",
    "sender-key.json": "sender-key",
    "sender-key-memory.json": "sender-key-memory",
    "session.json": "session",
    "pre-key.json": "pre-key",
  };

  return keyTypeMap[fileName] || null;
}
