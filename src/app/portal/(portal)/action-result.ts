export interface ActionResult {
  ok: boolean;
  error?: string;
}

export const initialActionResult: ActionResult = { ok: false };
