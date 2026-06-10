import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const getScan = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ scanId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabase
      .from("scan_cases")
      .select("*")
      .eq("id", data.scanId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("진단 케이스를 찾을 수 없습니다.");
    return row;
  });
