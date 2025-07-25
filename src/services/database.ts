import { PrismaClient } from "@prisma/client";
import {
  ChatHistoryMessage,
  MessageType,
  MessageDirection,
  SessionStatus,
} from "@/types";

// Initialize Prisma Client
export const prisma = new PrismaClient();

/**
 * Database Service Class
 * Handles all database operations for WhatsApp sessions and chat history
 */
export class DatabaseService {
  /**
   * Create or get session from database
   * @param sessionId - Unique session identifier
   * @returns Session record from database
   */
  static async createSessionRecord(sessionId: string) {
    try {
      const existingSession = await prisma.whatsappSession.findUnique({
        where: { sessionId },
      });

      if (existingSession) {
        await prisma.whatsappSession.update({
          where: { sessionId },
          data: {
            status: "connecting",
            updatedAt: new Date(),
          },
        });
        return existingSession;
      }

      const session = await prisma.whatsappSession.create({
        data: {
          sessionId,
          status: "connecting",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return session;
    } catch (error) {
      console.error("Error creating session record:", error);
      return null;
    }
  }

  /**
   * Update session status in database
   * @param sessionId - Session identifier
   * @param status - New session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: string
  ): Promise<void> {
    try {
      await prisma.whatsappSession.update({
        where: { sessionId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating session status:", error);
    }
  }

  /**
   * Save chat history to database
   * @param sessionId - Session identifier
   * @param phoneNumber - Phone number of contact
   * @param message - Message content
   * @param messageType - Type of message
   * @param direction - Message direction (incoming/outgoing)
   * @param metadata - Additional message metadata
   */
  static async saveChatHistory(
    sessionId: string,
    phoneNumber: string,
    message: string,
    messageType: MessageType = "text",
    direction: MessageDirection = "outgoing",
    metadata: any = {}
  ): Promise<void> {
    try {
      await prisma.chatHistory.create({
        data: {
          sessionId,
          phoneNumber,
          message,
          messageType,
          direction,
          metadata: JSON.stringify(metadata),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }

  /**
   * Get chat history for a session
   * @param sessionId - Session identifier
   * @param phoneNumber - Optional phone number filter
   * @param page - Page number for pagination
   * @param limit - Number of records per page
   * @param cursor - Cursor for cursor-based pagination
   * @returns Chat history with pagination info
   */
  static async getChatHistory(
    sessionId: string,
    phoneNumber?: string,
    page: number = 1,
    limit: number = 25,
    cursor?: number
  ) {
    try {
      const where: any = { sessionId };

      if (phoneNumber) {
        where.phoneNumber = phoneNumber;
      }

      const chatHistory = await prisma.chatHistory.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: cursor ? undefined : (page - 1) * limit,
        take: limit,
        ...(cursor && { cursor: { id: cursor } }),
      });

      const total = await prisma.chatHistory.count({ where });

      return {
        data: chatHistory.map((chat) => ({
          ...chat,
          metadata: chat.metadata ? JSON.parse(chat.metadata) : {},
        })),
        cursor:
          chatHistory.length > 0
            ? chatHistory[chatHistory.length - 1].id
            : null,
        total,
      };
    } catch (error) {
      console.error("Error fetching chat history:", error);
      throw error;
    }
  }

  /**
   * Get sessions history with pagination
   * @param page - Page number
   * @param limit - Number of records per page
   * @returns Sessions with pagination info
   */
  static async getSessionsHistory(page: number = 1, limit: number = 20) {
    try {
      const sessions = await prisma.whatsappSession.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { chatHistory: true },
          },
        },
      });

      const total = await prisma.whatsappSession.count();

      return {
        data: sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching sessions history:", error);
      throw error;
    }
  }

  /**
   * Delete session from database
   * @param sessionId - Session identifier
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete related chat history first
      await prisma.chatHistory.deleteMany({
        where: { sessionId },
      });

      // Delete session
      await prisma.whatsappSession.delete({
        where: { sessionId },
      });
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  }

  /**
   * Save authentication data to database
   * @param sessionId - Session identifier
   * @param key - Authentication key name
   * @param value - Authentication data value
   */
  static async saveAuthData(
    sessionId: string,
    key: string,
    value: string
  ): Promise<void> {
    try {
      await prisma.authData.upsert({
        where: {
          sessionId_key: {
            sessionId,
            key,
          },
        },
        update: {
          value,
          updatedAt: new Date(),
        },
        create: {
          sessionId,
          key,
          value,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error saving auth data:", error);
      throw error;
    }
  }

  /**
   * Get authentication data from database
   * @param sessionId - Session identifier
   * @returns Array of authentication data
   */
  static async getAuthData(
    sessionId: string
  ): Promise<Array<{ key: string; value: string }>> {
    try {
      const authData = await prisma.authData.findMany({
        where: { sessionId },
        select: {
          key: true,
          value: true,
        },
      });

      return authData;
    } catch (error) {
      console.error("Error getting auth data:", error);
      return [];
    }
  }

  /**
   * Clear all authentication data for a session
   * @param sessionId - Session identifier
   */
  static async clearAuthData(sessionId: string): Promise<void> {
    try {
      await prisma.authData.deleteMany({
        where: { sessionId },
      });
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  /**
   * Get all connected sessions
   * @returns Array of connected sessions with their details
   */
  static async getConnectedSessions() {
    try {
      const connectedSessions = await prisma.whatsappSession.findMany({
        where: {
          OR: [{ status: "connected" }, { status: "authenticated" }],
        },
        select: {
          id: true,
          sessionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return connectedSessions;
    } catch (error) {
      console.error("Error getting connected sessions:", error);
      return [];
    }
  }

  /**
   * Get all sessions with their status
   * @returns Array of all sessions
   */
  static async getAllSessions() {
    try {
      const sessions = await prisma.whatsappSession.findMany({
        select: {
          id: true,
          sessionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return sessions;
    } catch (error) {
      console.error("Error getting all sessions:", error);
      return [];
    }
  }

  /**
   * Get session by sessionId
   * @param sessionId - Session identifier
   * @returns Session data or null
   */
  static async getSessionById(sessionId: string) {
    try {
      const session = await prisma.whatsappSession.findUnique({
        where: { sessionId },
        select: {
          id: true,
          sessionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return session;
    } catch (error) {
      console.error("Error getting session by ID:", error);
      return null;
    }
  }

  /**
   * Get user credentials info from auth data
   * @param sessionId - Session identifier
   * @returns User info (phone number, name, etc.)
   */
  static async getSessionUserInfo(sessionId: string) {
    try {
      const credsData = await prisma.authData.findUnique({
        where: {
          sessionId_key: {
            sessionId,
            key: "creds.json",
          },
        },
        select: {
          value: true,
        },
      });

      if (!credsData) {
        return null;
      }

      const creds = JSON.parse(credsData.value);

      // Extract user info from credentials
      const userInfo = {
        phoneNumber: null,
        name: null,
        jid: null,
        platform: null,
        registered: null,
      };

      if (creds.me) {
        userInfo.jid = creds.me.id;
        userInfo.name = creds.me.name;

        // Extract phone number from JID (format: phoneNumber:randomNumber@s.whatsapp.net)
        if (creds.me.id) {
          const phoneMatch = creds.me.id.match(/^(\d+):/);
          if (phoneMatch) {
            userInfo.phoneNumber = phoneMatch[1];
          }
        }
      }

      if (creds.platform) {
        userInfo.platform = creds.platform;
      }

      if (creds.registered !== undefined) {
        userInfo.registered = creds.registered;
      }

      return userInfo;
    } catch (error) {
      console.error("Error getting session user info:", error);
      return null;
    }
  }

  /**
   * Get connected sessions with user credentials
   * @returns Array of connected sessions with user info
   */
  static async getConnectedSessionsWithUserInfo() {
    try {
      const connectedSessions = await prisma.whatsappSession.findMany({
        where: {
          OR: [{ status: "connected" }, { status: "authenticated" }],
        },
        select: {
          id: true,
          sessionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Get user info for each session
      const sessionsWithUserInfo = await Promise.all(
        connectedSessions.map(async (session) => {
          const userInfo = await this.getSessionUserInfo(session.sessionId);
          return {
            ...session,
            userInfo,
          };
        })
      );

      return sessionsWithUserInfo;
    } catch (error) {
      console.error("Error getting connected sessions with user info:", error);
      return [];
    }
  }

  /**
   * Get all sessions with user credentials
   * @returns Array of all sessions with user info
   */
  static async getAllSessionsWithUserInfo() {
    try {
      const sessions = await prisma.whatsappSession.findMany({
        select: {
          id: true,
          sessionId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Get user info for each session
      const sessionsWithUserInfo = await Promise.all(
        sessions.map(async (session) => {
          const userInfo = await this.getSessionUserInfo(session.sessionId);
          return {
            ...session,
            userInfo,
          };
        })
      );

      return sessionsWithUserInfo;
    } catch (error) {
      console.error("Error getting all sessions with user info:", error);
      return [];
    }
  }

  /**
   * Disconnect from database
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}
