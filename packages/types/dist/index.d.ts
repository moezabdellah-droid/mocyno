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
    role: 'admin' | 'agent' | 'manager';
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
}
export interface Site {
    id: string;
    name: string;
    address?: string;
    clientContact?: string;
    email?: string;
    requiredSpecialties?: string[];
    notes?: string;
}
export interface Event {
    id: string;
    type: string;
    title: string;
    description?: string;
    authorEmail: string;
    timestamp: Date | string;
    status: string;
    photo?: string;
}
export interface Consigne {
    id: string;
    title: string;
    content: string;
    siteId?: string;
    siteName?: string;
    type?: string;
    priority?: 'low' | 'medium' | 'high';
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
export interface PayrollStats {
    agent: Agent;
    totalPlanned: number;
    totalDone: number;
    nightHours: number;
    sundayHours: number;
    holidayHours: number;
    futureHours: number;
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
