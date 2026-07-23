export type Role = 'COACH' | 'STUDENT' | 'ADMIN';

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
export type SubscriptionPlan = 'M3' | 'M6' | 'M12';
export type SubscriptionTier = 'FREE' | 'ECONOMY' | 'NORMAL' | 'PRO';

export interface CurrentUser {
  id: string;
  phone: string | null;
  email: string | null;
  /** Primary/landing role (and the ADMIN marker). */
  role: Role;
  /** Capabilities — one account can hold both sides; drives the role switcher. */
  isCoach: boolean;
  isStudent: boolean;
  locale: string;
  coachProfile: { name: string; avatarUrl: string | null; bio: string | null } | null;
  subscription: {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    plan: SubscriptionPlan | null;
    endsAt: string | null;
  } | null;
}

export interface SocialLink {
  type: string;
  label?: string;
  url: string;
}

export interface CoachProfile {
  userId: string;
  handle: string | null;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  socialLinks: SocialLink[];
  tags: string[];
  cardNumber: string | null;
  cardHolder: string | null;
  programPrice: number | null;
}

export interface PublicCoach {
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  tags: string[];
  socialLinks: SocialLink[];
  cardNumber: string | null;
  cardHolder: string | null;
  programPrice: number | null;
  phone: string | null;
  email: string | null;
}

export type ProgramRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface CreateProgramRequestInput {
  handle: string;
  fullName: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  trainingYears?: number;
  trainingMonths?: number;
  medicalHistory?: string;
  daysPerWeek?: number;
  photoFrontKey?: string;
  photoSideKey?: string;
  photoBackKey?: string;
  receiptKey?: string;
}

/** A request as the coach sees it (with signed photo URLs + a prefill contact). */
export interface CoachRequest {
  id: string;
  fullName: string;
  phone: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  trainingYears: number | null;
  trainingMonths: number | null;
  medicalHistory: string | null;
  daysPerWeek: number | null;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
  photoBackUrl: string | null;
  receiptUrl: string | null;
  contact: string;
  status: ProgramRequestStatus;
  declineReason: string | null;
  createdAt: string;
}

/** A request as the submitting student sees it (status + decline reason). */
export interface StudentRequest {
  id: string;
  fullName: string;
  daysPerWeek: number | null;
  status: ProgramRequestStatus;
  declineReason: string | null;
  createdAt: string;
  coach: { name: string; handle: string | null; avatarUrl: string | null };
}

export interface Category {
  id: string;
  coachId: string;
  name: string;
}

export interface Exercise {
  id: string;
  coachId: string;
  categoryId: string | null;
  name: string;
  defaultSets: number;
  defaultReps: string;
  description: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  category?: { id: string; name: string } | null;
}

export interface UploadTarget {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export type ProgramStatus2 = 'DRAFT' | 'PUBLISHED';

export interface ProgramListItem {
  id: string;
  name: string;
  status: ProgramStatus2;
  daysPerWeek: number;
  updatedAt: string;
  student: { phone: string | null; email: string | null };
  _count: { days: number };
}

export interface ProgramExerciseDetail {
  id: string;
  sets: number;
  reps: string;
  notes: string | null;
  order: number;
  supersetGroupId: string | null;
  supersetOrder: number | null;
  exercise: {
    id: string;
    name: string;
    gifUrl: string | null;
    videoUrl: string | null;
    defaultSets: number;
    defaultReps: string;
    description: string | null;
    category: { id: string; name: string } | null;
  };
}

export interface ProgramDayDetail {
  id: string;
  dayIndex: number;
  title: string | null;
  exercises: ProgramExerciseDetail[];
}

export type PaymentGateway = 'ZARINPAL' | 'STRIPE';
/** Gateways offered for new checkouts (Stripe is disabled — historical rows only). */
export type CheckoutGateway = 'ZARINPAL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface BillingPlan {
  id: SubscriptionPlan;
  months: number;
  priceIrr: number;
  priceUsd: number;
}

export interface PaymentRecord {
  id: string;
  gateway: PaymentGateway;
  plan: SubscriptionPlan;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface BillingSummary {
  subscription: {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    plan: SubscriptionPlan | null;
    startsAt: string;
    endsAt: string | null;
  } | null;
  plans: BillingPlan[];
  payments: PaymentRecord[];
  simulateMode: boolean;
}

export interface StudentCoach {
  coachId: string;
  name: string;
  avatarUrl: string | null;
  contact: string;
  programCount: number;
}

export interface StudentProgramListItem {
  id: string;
  name: string;
  daysPerWeek: number;
  updatedAt: string;
  _count: { days: number };
}

export interface StudentViewerExercise {
  id: string;
  sets: number;
  reps: string;
  notes: string | null;
  order: number;
  supersetGroupId: string | null;
  supersetOrder: number | null;
  exercise: { id: string; name: string; gifUrl: string | null; videoUrl: string | null; description: string | null };
}

export interface StudentViewerDay {
  id: string;
  dayIndex: number;
  title: string | null;
  exercises: StudentViewerExercise[];
}

export interface StudentProgramDetail {
  id: string;
  name: string;
  coachId: string;
  daysPerWeek: number;
  coach: { name: string; avatarUrl: string | null };
  days: StudentViewerDay[];
}

export interface ProgramDetail {
  id: string;
  name: string;
  status: ProgramStatus2;
  daysPerWeek: number;
  studentAge: number | null;
  studentHeightCm: number | null;
  studentWeightKg: number | null;
  pdfUrl: string | null;
  pdfStaleAt: string | null;
  student: {
    id: string;
    phone: string | null;
    email: string | null;
    age: number | null;
    heightCm: number | null;
    weightKg: number | null;
    userId: string | null;
  };
  days: ProgramDayDetail[];
}

// ── Program templates (reusable, student-agnostic) ───────────────────────────
export interface ProgramTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  updatedAt: string;
  _count: { days: number };
}

export interface ProgramTemplateDetail {
  id: string;
  name: string;
  description: string | null;
  daysPerWeek: number;
  createdAt: string;
  updatedAt: string;
  days: ProgramDayDetail[]; // same day/exercise/superset shape as a program
}

// ── Admin panel ──────────────────────────────────────────────────────────────
export interface AdminOverview {
  totals: {
    coaches: number;
    students: number;
    programs: number;
    publishedPrograms: number;
    requests: number;
    pendingRequests: number;
    exercises: number;
  };
  /** Coach count per capability tier, ordered FREE → ECONOMY → NORMAL → PRO. */
  tiers: { tier: SubscriptionTier; count: number }[];
  /** New signups in the trailing 7 / 30 days, by role. */
  growth: {
    newCoaches7: number;
    newCoaches30: number;
    newStudents7: number;
    newStudents30: number;
  };
  revenue: { currency: string; total: number; payments: number }[];
  recentUsers: {
    id: string;
    phone: string | null;
    email: string | null;
    role: Role;
    createdAt: string;
  }[];
}

export interface AdminCoach {
  userId: string;
  name: string;
  handle: string | null;
  phone: string | null;
  email: string | null;
  joinedAt: string;
  /** Current capability tier and its student cap (`cap` null = unlimited). */
  tier: SubscriptionTier;
  cap: number | null;
  atQuota: boolean;
  subscription: {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    plan: SubscriptionPlan | null;
    endsAt: string | null;
    live: boolean;
  } | null;
  counts: { programs: number; students: number; exercises: number };
}

export interface AdminPayment {
  id: string;
  plan: SubscriptionPlan | null;
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string | null;
  createdAt: string;
  coach: { name: string; handle: string | null };
}
