export interface Vacation {
    date: string;
    start: string;
    end: string;
}

export interface AgentAssignment {
    agentId: string;
    agentName: string;
    specialty: string;
    vacations: Vacation[];
}

export interface Mission {
    id: string;
    siteId: string;
    siteName: string;
    agentAssignments: AgentAssignment[];
    assignedAgentIds: string[];
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    createdAt: Date | string;
    updatedAt?: Date | string;
}

export interface Agent {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'agent' | 'manager' | 'client';
    specialties?: string[];
    status: 'active' | 'inactive';
    photoURL?: string;
    matricule?: string;
    birthDate?: string;
    birthPlace?: string;
    nationality?: string;
    gender?: 'M' | 'F';
    bloodGroup?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    phone?: string;
    professionalCardNumber?: string;
    professionalCardObtainedAt?: string;
    sstNumber?: string;
    sstObtainedAt?: string;
    sstExpiresAt?: string;
    contractNature?: 'CDI' | 'CDD' | 'SAISONNIER' | 'EXTRA' | 'INTERIM';
    contractType?: 'FULL_TIME' | 'PART_TIME';
    socialSecurityNumber?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    dogIds?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    isServiceRunning?: boolean;
    mustChangePassword?: boolean;
    siteId?: string;
    siteName?: string;
    location?: { lat: number; lng: number; lastUpdated?: Date | string };
}

export interface Site {
    id: string;
    name: string;
    address?: string;
    clientContact?: string;
    email?: string;
    requiredSpecialties?: string[];
    notes?: string;
    /** Client linkage — used by Firestore rules and client portal */
    clientId?: string;
    clientIds?: string[];
    authorizedClients?: string[];
    primaryClientId?: string;
}

export interface Event {
    id: string;
    type: 'MAIN_COURANTE' | 'INCIDENT' | 'OBSERVATION' | 'RDL_CHECKPOINT' | 'SOS' | 'SERVICE_START' | 'SERVICE_STOP' | string;
    title?: string;
    description?: string;
    authorId?: string;
    authorEmail: string;
    agentName?: string;
    siteId?: string;
    siteName?: string;
    timestamp: Date | string;
    status: string;
    photo?: string;
    photoPath?: string;
    priority?: 'CRITICAL' | string;
    location?: { lat: number; lng: number };
    content?: string;
}

export interface Consigne {
    id: string;
    title: string;
    content: string;
    siteId?: string;
    siteName?: string;
    type?: string;
    priority?: 'low' | 'medium' | 'high';
    targetId?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

// ── Client Portal types ───────────────────────────────────

export interface Client {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'client';
    company?: string;
    phone?: string;
    clientId?: string;
    siteId?: string;
    siteName?: string;
    mustChangePassword?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface Report {
    id: string;
    title?: string;
    description?: string;
    type?: string;
    status?: string;
    authorId?: string;
    authorEmail?: string;
    agentName?: string;
    siteId?: string;
    siteName?: string;
    clientId?: string;
    photo?: string;
    photoPath?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface ClientRequest {
    id: string;
    subject: string;
    message: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    clientId: string;
    clientName?: string;
    siteId?: string;
    siteName?: string;
    responseMessage?: string;
    respondedBy?: string;
    respondedAt?: Date | string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface Document {
    id: string;
    titre: string;
    storagePath: string;
    clientId?: string;
    category?: string;
    visibility?: { client?: boolean };
    uploadedBy?: string;
    signedUrl?: string;
    createdAt?: Date | string;
}

export interface DocumentDownload {
    id: string;
    documentId: string;
    clientId: string;
    downloadedAt?: Date | string;
    userAgent?: string;
}

export interface ShiftSegment {
    id: string;
    agentId: string;
    agentName?: string;
    siteId?: string;
    siteName?: string;
    clientId?: string;
    startTimestamp?: Date | string;
    endTimestamp?: Date | string;
    status?: string;
}

export interface AuditLog {
    id: string;
    action: string;
    performedBy: string;
    performedByEmail?: string;
    targetCollection?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    timestamp?: Date | string;
}

// ── Planning & Payroll types ──────────────────────────────

export interface PayrollStats {
    agent: Agent;
    totalPlanned: number;
    totalDone: number;
    nightHours: number;
    sundayHours: number;
    holidayHours: number;
    futureHours: number;
    agentsCount?: number;
}

export interface VacationStats {
    total: number;
    night: number;
    sunday: number;
    holiday: number;
}

export interface MissionStats {
    totalHours: number;
    doneHours: number;
    futureHours: number;
    agentsCount: number;
    sitesCount: number;
}

// Planning-specific types
export interface PlanningEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    agentId: string;
    agentName: string;
    missionId: string;
    siteId: string;
    siteName: string;
    assignmentIdx: number;
    vacationIdx: number;
    color?: string;
    allDay?: boolean;
    resource?: {
        mission: Mission;
        assignment: AgentAssignment;
        vacation: Vacation;
    };
}

export interface AgentSchedule {
    agent: Agent;
    events: PlanningEvent[];
    totalHours: number;
}

export interface CalendarSlotInfo {
    start: Date;
    end: Date;
    action: 'select' | 'click' | 'doubleClick';
    slots: Date[];
}

export interface DragEventData {
    event: PlanningEvent;
    start: Date;
    end: Date;
    resourceId?: string;
    isAllDay: boolean;
}

