import React from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  TIS_INTEGRATOR_CHECKLIST,
  checklistProgress,
  type TisChecklistItem,
} from "./types";
import { tis } from "./tisTheme";

type Props = {
  checklist: Record<string, boolean>;
  onToggle: (id: string, checked: boolean) => void;
  readOnly?: boolean;
};

function groupByCategory(items: TisChecklistItem[]): Map<string, TisChecklistItem[]> {
  const map = new Map<string, TisChecklistItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

export const TisCertificationChecklist: React.FC<Props> = ({ checklist, onToggle, readOnly }) => {
  const { completed, total, percent } = checklistProgress(checklist);
  const grouped = groupByCategory(TIS_INTEGRATOR_CHECKLIST);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-sm font-medium text-slate-700">
            KRA TIS integrator readiness: {completed}/{total} requirements
          </span>
          <Badge variant={percent >= 100 ? "default" : "secondary"}>{percent}%</Badge>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      {[...grouped.entries()].map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h4 className={tis.checklistCategory}>{category}</h4>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className={`flex items-start gap-3 rounded-md px-3 py-2 ${tis.checklistItem}`}>
                <Checkbox
                  id={`tis-check-${item.id}`}
                  checked={!!checklist[item.id]}
                  disabled={readOnly}
                  onCheckedChange={(v) => onToggle(item.id, v === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`tis-check-${item.id}`} className={`cursor-pointer ${tis.checklistLabel}`}>
                    {item.label}
                  </Label>
                  <p className={tis.checklistDesc}>{item.description}</p>
                  {item.kraRef ? (
                    <p className="mt-0.5 text-[10px] text-slate-500">Ref: {item.kraRef}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
