import { ExercisesService } from "./service";

const PRESET = [
  {
    id: "1",
    name: "Barbell Bench Press",
    categoryId: "c1",
    category: { id: "c1", name: "Chest" },
    gifUrl: null,
  },
  {
    id: "2",
    name: "Back Squat",
    categoryId: "c2",
    category: { id: "c2", name: "Legs" },
    gifUrl: null,
  },
];

describe("ExercisesService", () => {
  let prisma: any;
  let storage: any;
  let service: ExercisesService;

  beforeEach(() => {
    prisma = {
      exercise: {
        findMany: jest.fn().mockResolvedValue(PRESET),
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "new" }),
      },
      exerciseCategory: { findFirst: jest.fn() },
    };
    storage = { createUploadTarget: jest.fn(), deleteByPublicUrl: jest.fn() };
    service = new ExercisesService(prisma, storage);
  });

  /** The `where` the service handed to Prisma for the most recent list call. */
  const lastWhere = () => prisma.exercise.findMany.mock.calls[0][0].where;

  // Filtering runs in SQL (not over a full in-memory load), so these assert the
  // query that gets built rather than a filtered array.
  it("searches the exercise name and its category name, case-insensitively", async () => {
    await service.list("coach1", { search: " press " });
    expect(lastWhere()).toEqual({
      coachId: "coach1",
      OR: [
        { name: { contains: "press", mode: "insensitive" } },
        { category: { name: { contains: "press", mode: "insensitive" } } },
      ],
    });
  });

  it("filters by categoryId", async () => {
    await service.list("coach1", { categoryId: "c2" });
    expect(lastWhere()).toEqual({ coachId: "coach1", categoryId: "c2" });
  });

  it("scopes to the coach when no filters are given", async () => {
    await service.list("coach1", {});
    expect(lastWhere()).toEqual({ coachId: "coach1" });
  });

  it("returns a page envelope with the total from a matching count query", async () => {
    prisma.exercise.count.mockResolvedValue(42);
    const res = await service.list("coach1", { page: 2, pageSize: 20 });

    expect(res.items).toHaveLength(2);
    expect(res).toMatchObject({ page: 2, pageSize: 20, total: 42, totalPages: 3 });
    // The window must be applied in SQL, and counted with the same filters.
    expect(prisma.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    expect(prisma.exercise.count).toHaveBeenCalledWith({ where: lastWhere() });
  });

  it("clamps an out-of-range page size instead of rejecting it", async () => {
    await service.list("coach1", { page: 0, pageSize: 5000 });
    expect(prisma.exercise.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }), // MAX_PAGE_SIZE
    );
  });

  it("persists a new exercise on create", async () => {
    await service.create("coach1", { name: "Deadlift" });
    expect(prisma.exercise.create).toHaveBeenCalled();
  });

  it("rejects a category not owned by the coach on create", async () => {
    prisma.exerciseCategory.findFirst.mockResolvedValue(null);
    await expect(
      service.create("coach1", { name: "X", categoryId: "nope" }),
    ).rejects.toThrow();
    expect(prisma.exercise.create).not.toHaveBeenCalled();
  });
});
