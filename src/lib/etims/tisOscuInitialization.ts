/**
 * KRA OSCU/VSCU device initialization via etims-proxy.
 * Supports direct KRA path (selectInitOsdcInfo) and integrator wrapper (/initialize).
 */

import { invokeEtimsProxy } from "./invokeEtimsProxy";
import type { TisSolutionType } from "@/components/admin/tis-integrator/types";

export type OscuInitRequest = {
  tin: string;
  bhfId: string;
  dvcSrlNo: string;
};

export type OscuInitResult = {
  ok: boolean;
  message: string;
  path: string;
  communicationKeyRef: string | null;
  deviceId: string | null;
  branchName: string | null;
  redactedResponse: unknown;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function deepFindKey(obj: unknown, keys: string[]): unknown {
  if (!isRecord(obj)) return undefined;
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  for (const v of Object.values(obj)) {
    if (isRecord(v)) {
      const found = deepFindKey(v, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** Mask communication key in response before persisting. */
export function redactInitResponse(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const clone = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  const mask = (obj: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(obj)) {
      if (/cmckey|communication.?key|commkey/i.test(k) && typeof v === "string" && v.length > 4) {
        obj[k] = `***${v.slice(-4)}`;
      } else if (isRecord(v)) {
        mask(v);
      }
    }
  };
  mask(clone);
  return clone;
}

function communicationKeyRefFromResponse(data: unknown): string | null {
  const raw = deepFindKey(data, ["cmcKey", "cmckey", "communicationKey", "commKey"]);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = raw.trim();
  return t.length <= 8 ? `***${t}` : `***${t.slice(-8)}`;
}

function parseInitSuccess(data: unknown): {
  deviceId: string | null;
  branchName: string | null;
  keyRef: string | null;
} {
  const deviceId = deepFindKey(data, ["dvcId", "deviceId", "dvc_id"]);
  const branchName = deepFindKey(data, ["bhfNm", "branchName", "bhf_nm"]);
  return {
    deviceId: typeof deviceId === "string" ? deviceId : null,
    branchName: typeof branchName === "string" ? branchName : null,
    keyRef: communicationKeyRefFromResponse(data),
  };
}

export function buildOscuInitBody(req: OscuInitRequest): Record<string, string> {
  return {
    tin: req.tin.trim(),
    bhfId: req.bhfId.trim(),
    dvcSrlNo: req.dvcSrlNo.trim(),
  };
}

/** KRA OSCU: POST /selectInitOsdcInfo — body { tin, bhfId, dvcSrlNo } */
export async function invokeOscuInitialization(
  req: OscuInitRequest,
  solutionType: TisSolutionType = "OSCU",
): Promise<OscuInitResult> {
  const body = buildOscuInitBody(req);
  const paths =
    solutionType === "VSCU"
      ? ["selectInitInfo", "initialize"]
      : ["selectInitOsdcInfo", "initialize"];

  let lastMessage = "Initialization failed";
  let lastResponse: unknown;

  for (const path of paths) {
    const res = await invokeEtimsProxy({ method: "POST", path, body });
    lastResponse = res.data;
    if (res.ok) {
      const parsed = parseInitSuccess(res.data);
      return {
        ok: true,
        message: `Device initialized via ${path}`,
        path,
        communicationKeyRef: parsed.keyRef,
        deviceId: parsed.deviceId,
        branchName: parsed.branchName,
        redactedResponse: redactInitResponse(res.data),
      };
    }
    lastMessage = res.message;
    if (res.status !== 403 && res.status !== 404) break;
  }

  return {
    ok: false,
    message: lastMessage,
    path: paths[0] ?? "selectInitOsdcInfo",
    communicationKeyRef: null,
    deviceId: null,
    branchName: null,
    redactedResponse: redactInitResponse(lastResponse),
  };
}

export function validateOscuInitFields(req: Partial<OscuInitRequest>): string | null {
  const tin = (req.tin ?? "").trim();
  const bhfId = (req.bhfId ?? "").trim();
  const dvcSrlNo = (req.dvcSrlNo ?? "").trim();
  if (!tin) return "KRA PIN (tin) is required for OSCU/VSCU initialization.";
  if (tin.length > 11) return "KRA PIN must be at most 11 characters.";
  if (!bhfId) return "Branch code (bhfId) is required — typically 2 characters, e.g. 00.";
  if (bhfId.length > 2) return "Branch code (bhfId) must be 2 characters per KRA spec.";
  if (!dvcSrlNo) return "Device serial (dvcSrlNo) is required — use KRA-approved sandbox serial.";
  return null;
}
