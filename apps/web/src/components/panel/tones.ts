import type { TicketStatus } from "@avrupadasat/db";
import type { Tone } from "./ui";

export const TICKET_TONE: Record<TicketStatus, Tone> = {
  OPEN: "red",
  WAITING_TEAM: "blue",
  WAITING_CUSTOMER: "amber",
  RESOLVED: "green",
  CLOSED: "neutral",
};

export const REVIEW_TONE: Record<string, Tone> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};
