import { Request, Response } from "express";
import {
  SessionCreateRequest,
  AuthenticatedRequest,
  SessionListResponse,
  SessionStatusResponse,
  QRResponse,
} from "@/types";
import { WhatsAppService, DatabaseService } from "@/services";
import { getSessionStatus, isValidSessionId } from "@/utils";
import { asyncHandler } from "@/middleware";

/**
 * Session Controller
 * Handles all session-related API endpoints
 */
export class SessionController {
  /**
   * GET /sessions - List all active sessions
   */
  static listSessions = asyncHandler(async (req: Request, res: Response) => {
    const sessions = WhatsAppService.getSessions();
    const sessionList: SessionListResponse[] = [];

    for (const [sessionId] of sessions) {
      sessionList.push({
        id: sessionId,
        status: getSessionStatus(sessionId, sessions),
      });
    }

    res.json(sessionList);
  });

  /**
   * GET /sessions/:sessionId - Find specific session
   */
  static findSession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const sessions = WhatsAppService.getSessions();

    if (sessions.has(sessionId)) {
      res.json({
        success: true,
        message: "Session found",
        data: {
          id: sessionId,
          status: getSessionStatus(sessionId, sessions),
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }
  });

  /**
   * GET /sessions/:sessionId/status - Get session status
   */
  static getSessionStatus = asyncHandler(
    async (req: Request, res: Response) => {
      const { sessionId } = req.params;
      const sessions = WhatsAppService.getSessions();
      const sessionQRs = WhatsAppService.getSessionQRs();

      const status = getSessionStatus(sessionId, sessions);
      const qr = sessionQRs.get(sessionId);

      const response: SessionStatusResponse = { status };

      // Include QR code if available and not authenticated
      if (qr && status !== "AUTHENTICATED") {
        response.qr = qr;
      }

      res.json(response);
    }
  );

  /**
   * GET /sessions/:sessionId/qr - Get QR code for session
   */
  static getQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const sessions = WhatsAppService.getSessions();
    const sessionQRs = WhatsAppService.getSessionQRs();

    if (!sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const sessionData = sessions.get(sessionId)!;

    // If already authenticated, no QR needed
    if (sessionData.isAuthenticated) {
      return res.json({
        success: true,
        message: "Session already authenticated",
        status: "AUTHENTICATED",
      });
    }

    const qr = sessionQRs.get(sessionId);
    if (qr) {
      const response: QRResponse = {
        success: true,
        qr: qr,
        message: "Scan QR code with WhatsApp",
        sessionId: sessionId,
        status: getSessionStatus(sessionId, sessions),
      };
      res.json(response);
    } else {
      const response: QRResponse = {
        success: false,
        message: "QR code not available yet",
        sessionId: sessionId,
        status: getSessionStatus(sessionId, sessions),
      };
      res.json(response);
    }
  });

  /**
   * POST /sessions/add - Add new session
   */
  static addSession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, ...options }: SessionCreateRequest = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID format",
      });
    }

    const sessions = WhatsAppService.getSessions();
    const sessionQRs = WhatsAppService.getSessionQRs();

    // Check if session already exists
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId)!;

      // If session is authenticated, return success immediately
      if (existingSession.isAuthenticated) {
        return res.json({
          success: true,
          message: "Session already authenticated",
          sessionId: sessionId,
          status: "AUTHENTICATED",
        });
      }

      // If session exists but not authenticated, check if QR is available
      const existingQR = sessionQRs.get(sessionId);
      if (existingQR) {
        return res.json({
          success: true,
          qr: existingQR,
          message: "Session exists, scan QR code to authenticate",
          sessionId: sessionId,
          status: getSessionStatus(sessionId, sessions),
        });
      }

      console.log(
        `[${sessionId}] Session exists but no QR available, recreating...`
      );
    }

    console.log(`[${sessionId}] Creating new WhatsApp connection...`);

    try {
      // Create or recreate the session
      await WhatsAppService.createConnection(sessionId, options);

      // Wait for QR code generation
      const qrResult = await WhatsAppService.waitForQR(sessionId);

      if (qrResult === "authenticated") {
        return res.json({
          success: true,
          message: "Session authenticated successfully",
          sessionId: sessionId,
          status: "AUTHENTICATED",
        });
      } else if (qrResult) {
        return res.json({
          success: true,
          qr: qrResult,
          message: "QR code generated successfully",
          sessionId: sessionId,
          status: getSessionStatus(sessionId, sessions),
        });
      } else {
        // QR timeout - check current status
        const currentStatus = getSessionStatus(sessionId, sessions);
        const session = sessions.get(sessionId);

        console.log(
          `[${sessionId}] QR generation timeout. Current status: ${currentStatus}`
        );

        return res.json({
          success: false,
          message:
            "QR code generation timeout. Check your internet connection and try again.",
          sessionId: sessionId,
          status: currentStatus,
          debug: {
            hasSession: !!session,
            hasSocket: !!session?.socket,
            hasWebSocket: !!session?.socket?.ws,
          },
        });
      }
    } catch (error) {
      console.error(`Error adding session:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to add session",
        error: (error as Error).message,
      });
    }
  });

  /**
   * DELETE /sessions/:sessionId - Delete session
   */
  static deleteSession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    try {
      await WhatsAppService.deleteSession(sessionId);

      res.json({
        success: true,
        message: "Session deleted",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete session",
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /sessions-history - Get sessions history
   */
  static getSessionsHistory = asyncHandler(
    async (req: Request, res: Response) => {
      const { page = "1", limit = "20" } = req.query;

      try {
        const result = await DatabaseService.getSessionsHistory(
          parseInt(page as string),
          parseInt(limit as string)
        );

        res.json({
          success: true,
          ...result,
        });
      } catch (error) {
        console.error("Error fetching sessions history:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch sessions history",
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /sessions/connected - Get all connected sessions
   */
  static getConnectedSessions = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const connectedSessions = await DatabaseService.getConnectedSessions();
        const activeSessions = WhatsAppService.getSessions();

        // Enhance with runtime session info
        const enhancedSessions = connectedSessions.map((session) => {
          const runtimeSession = activeSessions.get(session.sessionId);
          return {
            ...session,
            isActive: !!runtimeSession,
            isAuthenticated: runtimeSession?.isAuthenticated || false,
            startTime: runtimeSession?.startTime || null,
            connectionStatus: runtimeSession
              ? getSessionStatus(session.sessionId, activeSessions)
              : "DISCONNECTED",
          };
        });

        res.json({
          success: true,
          message: "Connected sessions retrieved successfully",
          data: enhancedSessions,
          count: enhancedSessions.length,
        });
      } catch (error) {
        console.error("Error fetching connected sessions:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch connected sessions",
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /sessions/all - Get all sessions from database
   */
  static getAllSessions = asyncHandler(async (req: Request, res: Response) => {
    try {
      const allSessions = await DatabaseService.getAllSessions();
      const activeSessions = WhatsAppService.getSessions();

      // Enhance with runtime session info
      const enhancedSessions = allSessions.map((session) => {
        const runtimeSession = activeSessions.get(session.sessionId);
        return {
          ...session,
          isActive: !!runtimeSession,
          isAuthenticated: runtimeSession?.isAuthenticated || false,
          startTime: runtimeSession?.startTime || null,
          connectionStatus: runtimeSession
            ? getSessionStatus(session.sessionId, activeSessions)
            : "DISCONNECTED",
        };
      });

      res.json({
        success: true,
        message: "All sessions retrieved successfully",
        data: enhancedSessions,
        count: enhancedSessions.length,
      });
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch all sessions",
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /sessions/connected/credentials - Get connected sessions with user credentials
   */
  static getConnectedSessionsWithCredentials = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const connectedSessions =
          await DatabaseService.getConnectedSessionsWithUserInfo();
        const activeSessions = WhatsAppService.getSessions();

        // Enhance with runtime session info
        const enhancedSessions = connectedSessions.map((session) => {
          const runtimeSession = activeSessions.get(session.sessionId);
          return {
            ...session,
            isActive: !!runtimeSession,
            isAuthenticated: runtimeSession?.isAuthenticated || false,
            startTime: runtimeSession?.startTime || null,
            connectionStatus: runtimeSession
              ? getSessionStatus(session.sessionId, activeSessions)
              : "DISCONNECTED",
          };
        });

        res.json({
          success: true,
          message: "Connected sessions with credentials retrieved successfully",
          data: enhancedSessions,
          count: enhancedSessions.length,
        });
      } catch (error) {
        console.error(
          "Error fetching connected sessions with credentials:",
          error
        );
        res.status(500).json({
          success: false,
          message: "Failed to fetch connected sessions with credentials",
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /sessions/all/credentials - Get all sessions with user credentials
   */
  static getAllSessionsWithCredentials = asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const allSessions = await DatabaseService.getAllSessionsWithUserInfo();
        const activeSessions = WhatsAppService.getSessions();

        // Enhance with runtime session info
        const enhancedSessions = allSessions.map((session) => {
          const runtimeSession = activeSessions.get(session.sessionId);
          return {
            ...session,
            isActive: !!runtimeSession,
            isAuthenticated: runtimeSession?.isAuthenticated || false,
            startTime: runtimeSession?.startTime || null,
            connectionStatus: runtimeSession
              ? getSessionStatus(session.sessionId, activeSessions)
              : "DISCONNECTED",
          };
        });

        res.json({
          success: true,
          message: "All sessions with credentials retrieved successfully",
          data: enhancedSessions,
          count: enhancedSessions.length,
        });
      } catch (error) {
        console.error("Error fetching all sessions with credentials:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch all sessions with credentials",
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /sessions/:sessionId/credentials - Get specific session credentials
   */
  static getSessionCredentials = asyncHandler(
    async (req: Request, res: Response) => {
      const { sessionId } = req.params;

      try {
        const session = await DatabaseService.getSessionById(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            message: "Session not found",
          });
        }

        const userInfo = await DatabaseService.getSessionUserInfo(sessionId);
        const activeSessions = WhatsAppService.getSessions();
        const runtimeSession = activeSessions.get(sessionId);

        const sessionWithCredentials = {
          ...session,
          userInfo,
          isActive: !!runtimeSession,
          isAuthenticated: runtimeSession?.isAuthenticated || false,
          startTime: runtimeSession?.startTime || null,
          connectionStatus: runtimeSession
            ? getSessionStatus(sessionId, activeSessions)
            : "DISCONNECTED",
        };

        res.json({
          success: true,
          message: "Session credentials retrieved successfully",
          data: sessionWithCredentials,
        });
      } catch (error) {
        console.error("Error fetching session credentials:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch session credentials",
          error: (error as Error).message,
        });
      }
    }
  );
}
