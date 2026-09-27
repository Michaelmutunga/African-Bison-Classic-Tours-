/** Pure group-travel view helpers (Phase 9). Client-safe. */

export interface TravellerCompletionInput {
  fullName?: string;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry?: Date | string | null;
  emergencyContact: string | null;
  roomPreference: string | null;
  email?: string | null;
}

export interface TravellerCompletion {
  details: boolean;
  passport: boolean;
  emergency: boolean;
  room: boolean;
  complete: boolean;
}

export function travellerCompletion(t: TravellerCompletionInput): TravellerCompletion {
  const details = (t.fullName ?? "").trim().length >= 2;
  const passport = !!t.nationality && !!t.passportNumber;
  const emergency = !!t.emergencyContact && t.emergencyContact.trim().length >= 2;
  const room = !!t.roomPreference && t.roomPreference.trim().length >= 2;
  return { details, passport, emergency, room, complete: details && passport && emergency };
}

export interface GroupSummary {
  total: number;
  completed: number;
  passports: number;
  roomsPending: number;
}

export function groupSummary(travellers: TravellerCompletionInput[]): GroupSummary {
  const states = travellers.map(travellerCompletion);
  return {
    total: travellers.length,
    completed: states.filter((s) => s.complete).length,
    passports: states.filter((s) => s.passport).length,
    roomsPending: states.filter((s) => !s.room).length,
  };
}

export function perPersonShare(totalCents: number, travellers: number): number {
  if (travellers <= 0) return totalCents;
  return Math.round(totalCents / travellers);
}
