import "server-only";
import { getConfig } from "./config";
import { getPrisma } from "./prisma";
import { StorageService } from "./storage";
import {
  createNotificationsService,
  NotificationsService,
} from "./notifications";
import { TokenService } from "./auth/tokens";
import { OtpService } from "./auth/otp";
import { UsersService } from "./users/service";
import { SubscriptionsService } from "./subscriptions/service";
import { AuthService } from "./auth/service";
import { CoachProfileService } from "./coach-profile/service";
import { CategoriesService } from "./categories/service";
import { ExercisesService } from "./exercises/service";
import { StudentsService } from "./students/service";
import { ProgramsService } from "./programs/service";
import { ProgramTemplatesService } from "./program-templates/service";
import { PublicCoachService } from "./public-coach/service";
import { ProgramRequestsService } from "./program-requests/service";
import { ZarinpalProvider } from "./payments/providers/zarinpal";
import { StripeProvider } from "./payments/providers/stripe";
import { PaymentsService } from "./payments/service";
import { PdfService } from "./pdf/service";
import { AdminService } from "./admin/service";

/**
 * Central DI container. Everything is a lazily-constructed singleton memoized on
 * `globalThis` so Next.js dev hot-reload reuses instances (one DB pool, one Redis
 * connection). Mirrors what the Nest module graph did, minus the framework.
 */
interface Container {
  storage?: StorageService;
  notifications?: NotificationsService;
  tokens?: TokenService;
  otp?: OtpService;
  users?: UsersService;
  subscriptions?: SubscriptionsService;
  auth?: AuthService;
  coachProfile?: CoachProfileService;
  categories?: CategoriesService;
  exercises?: ExercisesService;
  students?: StudentsService;
  programs?: ProgramsService;
  programTemplates?: ProgramTemplatesService;
  publicCoach?: PublicCoachService;
  programRequests?: ProgramRequestsService;
  zarinpal?: ZarinpalProvider;
  stripe?: StripeProvider;
  payments?: PaymentsService;
  pdf?: PdfService;
  admin?: AdminService;
}

const g = globalThis as unknown as { __fitloContainer?: Container };
const c: Container = (g.__fitloContainer ??= {});

export function getStorage(): StorageService {
  return (c.storage ??= new StorageService(getConfig()));
}

export function getNotifications(): NotificationsService {
  return (c.notifications ??= createNotificationsService(getConfig()));
}

export function getTokens(): TokenService {
  return (c.tokens ??= new TokenService(getPrisma(), getConfig()));
}

export function getOtp(): OtpService {
  return (c.otp ??= new OtpService(getPrisma(), getConfig()));
}

export function getUsers(): UsersService {
  return (c.users ??= new UsersService(getPrisma()));
}

export function getSubscriptions(): SubscriptionsService {
  return (c.subscriptions ??= new SubscriptionsService(getPrisma()));
}

export function getAuth(): AuthService {
  return (c.auth ??= new AuthService(
    getOtp(),
    getTokens(),
    getUsers(),
    getNotifications(),
    getConfig(),
  ));
}

export function getCoachProfile(): CoachProfileService {
  return (c.coachProfile ??= new CoachProfileService(
    getPrisma(),
    getStorage(),
  ));
}

export function getCategories(): CategoriesService {
  return (c.categories ??= new CategoriesService(getPrisma()));
}

export function getExercises(): ExercisesService {
  return (c.exercises ??= new ExercisesService(getPrisma(), getStorage()));
}

export function getStudents(): StudentsService {
  return (c.students ??= new StudentsService(getPrisma()));
}

export function getPrograms(): ProgramsService {
  return (c.programs ??= new ProgramsService(getPrisma(), getStudents()));
}

export function getProgramTemplates(): ProgramTemplatesService {
  return (c.programTemplates ??= new ProgramTemplatesService(
    getPrisma(),
    getPrograms(),
  ));
}

export function getPublicCoach(): PublicCoachService {
  return (c.publicCoach ??= new PublicCoachService(getPrisma()));
}

export function getProgramRequests(): ProgramRequestsService {
  return (c.programRequests ??= new ProgramRequestsService(
    getPrisma(),
    getStorage(),
    getStudents(),
  ));
}

export function getZarinpal(): ZarinpalProvider {
  return (c.zarinpal ??= new ZarinpalProvider(getConfig()));
}

export function getStripe(): StripeProvider {
  return (c.stripe ??= new StripeProvider(getConfig()));
}

export function getPayments(): PaymentsService {
  return (c.payments ??= new PaymentsService(
    getPrisma(),
    getConfig(),
    getSubscriptions(),
    getZarinpal(),
    getStripe(),
  ));
}

export function getPdf(): PdfService {
  return (c.pdf ??= new PdfService(
    getPrisma(),
    getConfig(),
    getStorage(),
    getPrograms(),
    getStudents(),
  ));
}

export function getAdmin(): AdminService {
  return (c.admin ??= new AdminService(getPrisma()));
}

// Re-export the shared singletons for convenience in route handlers/services.
export { getConfig, getPrisma };
