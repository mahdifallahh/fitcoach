import { ProgramStatus } from "@prisma/client";
import { ProgramTemplatesService } from "./service";
import { BadRequestException, NotFoundException } from "../http/errors";
import type { CreateTemplateDto } from "./schemas";

function baseDto(): CreateTemplateDto {
  return {
    name: "Beginner full-body",
    description: "3-day intro",
    daysPerWeek: 1,
    days: [
      {
        dayIndex: 1,
        title: "Full body",
        exercises: [
          { exerciseId: "e1", sets: 4, reps: "8-12", order: 0 },
          { exerciseId: "e2", sets: 3, reps: "12", order: 1, supersetGroupId: "g1", supersetOrder: 0 },
          { exerciseId: "e3", sets: 3, reps: "12", order: 1, supersetGroupId: "g1", supersetOrder: 1 },
        ],
      },
    ],
  };
}

describe("ProgramTemplatesService", () => {
  let prisma: any;
  let programs: any;
  let service: ProgramTemplatesService;

  beforeEach(() => {
    prisma = {
      exercise: { count: jest.fn() },
      programTemplate: {
        create: jest.fn().mockResolvedValue({ id: "t1" }),
        findFirst: jest.fn(),
      },
    };
    programs = { create: jest.fn().mockResolvedValue({ id: "p1" }) };
    service = new ProgramTemplatesService(prisma, programs);
  });

  it("rejects a template referencing exercises the coach does not own", async () => {
    prisma.exercise.count.mockResolvedValue(2); // only 2 of 3 unique ids owned
    await expect(service.create("coach1", baseDto())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.programTemplate.create).not.toHaveBeenCalled();
  });

  it("creates a template with nested days and supersets", async () => {
    prisma.exercise.count.mockResolvedValue(3); // all owned
    prisma.programTemplate.findFirst.mockResolvedValue({ id: "t1", days: [] });

    await service.create("coach1", baseDto());

    const data = prisma.programTemplate.create.mock.calls[0][0].data;
    expect(data.coachId).toBe("coach1");
    expect(data.name).toBe("Beginner full-body");
    const day = data.days.create[0];
    expect(day.dayIndex).toBe(1);
    const ex = day.exercises.create;
    expect(ex).toHaveLength(3);
    // superset rows share order + supersetGroupId
    expect(ex[1].order).toBe(1);
    expect(ex[2].order).toBe(1);
    expect(ex[1].supersetGroupId).toBe("g1");
  });

  it("assign() materializes a Program from the stored template", async () => {
    prisma.programTemplate.findFirst.mockResolvedValue({
      id: "t1",
      name: "Beginner full-body",
      daysPerWeek: 3,
      days: [
        {
          dayIndex: 1,
          title: "Full body",
          exercises: [
            { exerciseId: "e1", sets: 4, reps: "8-12", notes: null, order: 0, supersetGroupId: null, supersetOrder: null },
            { exerciseId: "e2", sets: 3, reps: "12", notes: null, order: 1, supersetGroupId: "g1", supersetOrder: 0 },
          ],
        },
      ],
    });

    await service.assign("coach1", "t1", {
      studentContact: "09120000000",
      age: 30,
      status: ProgramStatus.PUBLISHED,
    });

    expect(programs.create).toHaveBeenCalledTimes(1);
    const [coachId, payload] = programs.create.mock.calls[0];
    expect(coachId).toBe("coach1");
    expect(payload.studentContact).toBe("09120000000");
    expect(payload.name).toBe("Beginner full-body"); // falls back to template name
    expect(payload.daysPerWeek).toBe(3);
    expect(payload.status).toBe(ProgramStatus.PUBLISHED);
    expect(payload.days[0].exercises).toHaveLength(2);
    expect(payload.days[0].exercises[1].supersetGroupId).toBe("g1");
  });

  it("assign() lets the caller override the program name", async () => {
    prisma.programTemplate.findFirst.mockResolvedValue({
      id: "t1",
      name: "Beginner full-body",
      daysPerWeek: 1,
      days: [],
    });
    await service.assign("coach1", "t1", {
      studentContact: "09120000000",
      name: "Ali — week 1",
    });
    expect(programs.create.mock.calls[0][1].name).toBe("Ali — week 1");
  });

  it("throws NotFound when assigning a template the coach does not own", async () => {
    prisma.programTemplate.findFirst.mockResolvedValue(null);
    await expect(
      service.assign("coach1", "missing", { studentContact: "09120000000" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(programs.create).not.toHaveBeenCalled();
  });
});
