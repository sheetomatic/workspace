import type { LegalCase } from "@prisma/client";
import {
  FILE_COVER_JSON_KEY,
  type FileCoverData,
  type ProcessLogEntry,
  parseFileCoverData,
} from "@/lib/legal-cases/file-cover";

export type ProcessDiaryAction =
  | "mark_running"
  | "mark_statement"
  | "mark_stat_done"
  | "mark_pf"
  | "record_no_show"
  | "record_appearance"
  | "record_notice_stamps"
  | "record_client_call"
  | "add_log";

const NO_SHOW_MARKS = ["B", "C", "D", "E"] as const;

function todayLabel() {
  const date = new Date();
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function appendProcessLog(
  fileCover: FileCoverData,
  entry: ProcessLogEntry,
): FileCoverData {
  const log = [...fileCover.processLog];
  const emptyIndex = log.findIndex(
    (row) => !row.date.trim() && !row.process.trim(),
  );
  if (emptyIndex >= 0) {
    log[emptyIndex] = entry;
  } else {
    log.push(entry);
  }
  return { ...fileCover, processLog: log };
}

function nextNoShowMark(current: string | null | undefined) {
  const value = (current ?? "").trim().toUpperCase();
  const match = value.match(/\b([BCDE])\b/);
  if (!match) {
    return "B";
  }
  const index = NO_SHOW_MARKS.indexOf(match[1] as (typeof NO_SHOW_MARKS)[number]);
  if (index < 0 || index >= NO_SHOW_MARKS.length - 1) {
    return NO_SHOW_MARKS[NO_SHOW_MARKS.length - 1];
  }
  return NO_SHOW_MARKS[index + 1];
}

export type ProcessDiaryInput = {
  action: ProcessDiaryAction;
  logDate?: string;
  logProcess?: string;
  nextDate?: string;
  coAdvocate?: string;
  ownerDriverLawyer?: string;
  odPhone?: string;
  pfReadyDt?: string;
  pfCourtDt?: string;
  pfPostDt?: string;
  clientCallDate?: string;
  clientCallBy?: string;
};

export type ProcessDiaryResult = {
  fileStatus?: string | null;
  caseStage?: string | null;
  prevDate?: string | null;
  nextDate?: string | null;
  mccNumber?: string | null;
  coAdvocate?: string | null;
  amdCcStatus?: string | null;
  fileCover: FileCoverData;
  message: string;
};

export function applyProcessDiary(
  legalCase: LegalCase,
  input: ProcessDiaryInput,
): ProcessDiaryResult {
  let fileCover = parseFileCoverData(legalCase.sectionData);
  const stamp = todayLabel();

  switch (input.action) {
    case "mark_running": {
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "RUNNING",
      });
      return {
        fileStatus: "RUNNING",
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Case marked RUNNING.",
      };
    }
    case "mark_statement": {
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "STATEMENT",
      });
      return {
        fileStatus: "RUNNING",
        caseStage: "STATEMENT",
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Case stage set to STATEMENT.",
      };
    }
    case "mark_stat_done": {
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "STAT DONE",
      });
      return {
        fileStatus: legalCase.fileStatus ?? "RUNNING",
        caseStage: "STAT DONE",
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Statement marked complete. Update MCC No. when received.",
      };
    }
    case "mark_pf": {
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "PF ODC",
      });
      return {
        fileStatus: legalCase.fileStatus ?? "RUNNING",
        caseStage: "PF",
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "PF notice stage recorded.",
      };
    }
    case "record_no_show": {
      const mark = nextNoShowMark(legalCase.amdCcStatus);
      const prevStatus = legalCase.amdCcStatus?.trim();
      const amdCcStatus = prevStatus ? `${prevStatus} ${mark}` : mark;
      const nextDate = input.nextDate?.trim() || legalCase.nextDate;
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: `NO SHOW ${mark}`,
      });
      return {
        fileStatus: legalCase.fileStatus ?? "RUNNING",
        caseStage: legalCase.caseStage,
        prevDate: legalCase.nextDate ?? legalCase.prevDate,
        nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus,
        fileCover,
        message: `No-show marked ${mark}. Previous date rolled forward.`,
      };
    }
    case "record_appearance": {
      fileCover = {
        ...fileCover,
        advocateInsurance: input.coAdvocate?.trim() || fileCover.advocateInsurance,
        ownerDriverLawyer:
          input.ownerDriverLawyer?.trim() || fileCover.ownerDriverLawyer,
        odPhone: input.odPhone?.trim() || fileCover.odPhone,
      };
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "APPEARANCE",
      });
      return {
        fileStatus: legalCase.fileStatus,
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: input.coAdvocate?.trim() || legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Appearance and advocate details saved.",
      };
    }
    case "record_notice_stamps": {
      const pfTracking = [...fileCover.pfTracking];
      const row = pfTracking[0] ?? {
        pfLastDt: "",
        vikkyDt: "",
        pareDt: "",
        postDt: "",
        groupDt: "",
      };
      pfTracking[0] = {
        ...row,
        pfLastDt: input.pfReadyDt?.trim() || row.pfLastDt,
        vikkyDt: input.pfCourtDt?.trim() || row.vikkyDt,
        postDt: input.pfPostDt?.trim() || row.postDt,
      };
      fileCover = { ...fileCover, pfTracking };
      fileCover = appendProcessLog(fileCover, {
        date: stamp,
        process: "PF NOTICE STAMPS",
      });
      return {
        fileStatus: legalCase.fileStatus,
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Notice typed / court / post dates saved.",
      };
    }
    case "record_client_call": {
      const log = [...fileCover.calledClientLog];
      const emptyIndex = log.findIndex(
        (row) => !row.date.trim() && !row.by.trim(),
      );
      const entry = {
        date: input.clientCallDate?.trim() || stamp,
        by: input.clientCallBy?.trim() || "",
      };
      if (emptyIndex >= 0) {
        log[emptyIndex] = entry;
      } else {
        log.push(entry);
      }
      fileCover = { ...fileCover, calledClientLog: log };
      fileCover = appendProcessLog(fileCover, {
        date: entry.date,
        process: "CLIENT CALL",
      });
      return {
        fileStatus: legalCase.fileStatus,
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Client call logged.",
      };
    }
    case "add_log": {
      fileCover = appendProcessLog(fileCover, {
        date: input.logDate?.trim() || stamp,
        process: input.logProcess?.trim() || "",
      });
      return {
        fileStatus: legalCase.fileStatus,
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "Process log updated.",
      };
    }
    default:
      return {
        fileStatus: legalCase.fileStatus,
        caseStage: legalCase.caseStage,
        prevDate: legalCase.prevDate,
        nextDate: legalCase.nextDate,
        mccNumber: legalCase.mccNumber,
        coAdvocate: legalCase.coAdvocate,
        amdCcStatus: legalCase.amdCcStatus,
        fileCover,
        message: "No changes applied.",
      };
  }
}

export function serializeFileCoverPatch(fileCover: FileCoverData) {
  return { [FILE_COVER_JSON_KEY]: fileCover };
}
