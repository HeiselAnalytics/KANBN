import { randomBytes } from "node:crypto";

export type PublicIdPrefix = "sec" | "brd" | "lst" | "crd" | "clr" | "lbl" | "chk" | "itm" | "cmt" | "act" | "tpl";

export function createPublicId(prefix: PublicIdPrefix): string {
  return `${prefix}_${randomBytes(8).toString("base64url")}`;
}
