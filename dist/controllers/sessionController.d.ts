import { Request, Response } from 'express';
export declare class SessionController {
    static listSessions: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static findSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getSessionStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getQRCode: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static addSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static deleteSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getSessionsHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getConnectedSessions: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getAllSessions: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getConnectedSessionsWithCredentials: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getAllSessionsWithCredentials: (req: Request, res: Response, next: import("express").NextFunction) => void;
    static getSessionCredentials: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=sessionController.d.ts.map