import { existsSync } from "node:fs";
import { chromeCandidates, PdfService } from "./service";

jest.mock("node:fs", () => ({
  ...jest.requireActual("node:fs"),
  existsSync: jest.fn(),
}));
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe("chromeCandidates", () => {
  it("offers Windows Chrome/Edge locations built from the env roots", () => {
    const paths = chromeCandidates("win32", {
      PROGRAMFILES: "C:\\Program Files",
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
    });
    expect(paths).toContain(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    );
    expect(paths).toContain(
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    );
  });

  it("skips roots the environment does not define instead of emitting 'undefined\\...'", () => {
    const paths = chromeCandidates("win32", { PROGRAMFILES: "C:\\Program Files" });
    expect(paths.every((p) => p.startsWith("C:\\Program Files"))).toBe(true);
  });

  it("offers the app-bundle paths on macOS", () => {
    expect(chromeCandidates("darwin", {})).toContain(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    );
  });

  it("falls back to the Linux paths the Docker image provides", () => {
    expect(chromeCandidates("linux", {})[0]).toBe("/usr/bin/chromium");
  });
});

// ── getOrGenerate ───────────────────────────────────────────────────────────
// The cache lives in a single `Program.pdfUrl` column, so the locale has to be
// part of the object key — otherwise an ?locale=en download serves the Persian,
// right-to-left file that was rendered first.
const COACH = "coach1";
const PROGRAM = "prog1";

function makeService(program: { pdfUrl: string | null; pdfStaleAt: Date | null }) {
  const update = jest.fn().mockResolvedValue({});
  const putObject = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    coachProfile: { findUnique: jest.fn().mockResolvedValue({ name: "Coach" }) },
    program: { update },
  };
  const storage = {
    publicUrl: (_kind: string, key: string) => `https://cdn.test/pdfs/${key}`,
    putObject,
  };
  const programs = {
    get: jest.fn().mockResolvedValue({
      ...program,
      name: "P",
      daysPerWeek: 1,
      student: { phone: null, email: null },
      days: [],
    }),
  };
  const service = new PdfService(
    prisma as never,
    { get: () => undefined, isProduction: false } as never,
    storage as never,
    programs as never,
    {} as never,
  );
  // Stand in for Chromium: the cache decision is what these tests are about.
  const render = jest
    .spyOn(service as never as { renderPdf: () => Promise<Buffer> }, "renderPdf")
    .mockResolvedValue(Buffer.from("%PDF-fake"));
  return { service, update, putObject, render };
}

describe("PdfService.getOrGenerate caching", () => {
  beforeEach(() => mockExistsSync.mockReturnValue(false));

  it("serves the cached file when the stored URL matches the requested locale", async () => {
    const { service, render } = makeService({
      pdfUrl: `https://cdn.test/pdfs/${COACH}/${PROGRAM}-fa.pdf`,
      pdfStaleAt: null,
    });
    const res = await service.getOrGenerate(COACH, PROGRAM, "fa");
    expect(res.cached).toBe(true);
    expect(render).not.toHaveBeenCalled();
  });

  it("re-renders when the cached file is in the other locale", async () => {
    const { service, render, putObject } = makeService({
      pdfUrl: `https://cdn.test/pdfs/${COACH}/${PROGRAM}-fa.pdf`,
      pdfStaleAt: null,
    });
    const res = await service.getOrGenerate(COACH, PROGRAM, "en");
    expect(res.cached).toBe(false);
    expect(render).toHaveBeenCalledTimes(1);
    expect(putObject).toHaveBeenCalledWith(
      "pdfs",
      `${COACH}/${PROGRAM}-en.pdf`,
      expect.any(Buffer),
      "application/pdf",
    );
    expect(res.url).toBe(`https://cdn.test/pdfs/${COACH}/${PROGRAM}-en.pdf`);
  });

  it("re-renders when an edit marked the PDF stale", async () => {
    const { service, render } = makeService({
      pdfUrl: `https://cdn.test/pdfs/${COACH}/${PROGRAM}-fa.pdf`,
      pdfStaleAt: new Date(),
    });
    const res = await service.getOrGenerate(COACH, PROGRAM, "fa");
    expect(res.cached).toBe(false);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("re-renders a legacy row whose key predates the locale suffix", async () => {
    const { service, update } = makeService({
      pdfUrl: `https://cdn.test/pdfs/${COACH}/${PROGRAM}.pdf`,
      pdfStaleAt: null,
    });
    const res = await service.getOrGenerate(COACH, PROGRAM, "fa");
    expect(res.cached).toBe(false);
    expect(update).toHaveBeenCalledWith({
      where: { id: PROGRAM },
      data: {
        pdfUrl: `https://cdn.test/pdfs/${COACH}/${PROGRAM}-fa.pdf`,
        pdfStaleAt: null,
      },
    });
  });
});
