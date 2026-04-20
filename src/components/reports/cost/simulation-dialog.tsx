// src/app/(dashboard)/reports/cost/_components/simulation-dialog.tsx
"use client";

import { simulateSeatReduction } from "@/actions/seat-optimization";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type {
  SeatOptimizationItem,
  SimulationResult,
} from "@/types/seat-analytics";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function formatCurrency(value: number, currency = "KRW") {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(
    value
  );
}

export function SimulationDialog({
  item,
  onClose,
}: {
  item: SeatOptimizationItem;
  onClose: () => void;
}) {
  const [targetSeats, setTargetSeats] = useState(item.recommendedSeats);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = useCallback(
    async (target: number) => {
      setIsSimulating(true);
      const result = await simulateSeatReduction(item.subscriptionId, target);
      if (result.success && result.data) {
        setSimulation(result.data);
      }
      setIsSimulating(false);
    },
    [item.subscriptionId]
  );

  useEffect(() => {
    runSimulation(targetSeats);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSliderChange = (value: number[]) => {
    const newTarget = value[0];
    setTargetSeats(newTarget);
    runSimulation(newTarget);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.appName} - Seat 축소 시뮬레이션</DialogTitle>
          <DialogDescription>
            슬라이더를 조절하여 다양한 Seat 수의 절감 효과를 확인하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>목표 Seat 수</span>
              <span className="font-bold">{targetSeats}</span>
            </div>
            <Slider
              min={1}
              max={item.currentSeats}
              step={1}
              value={[targetSeats]}
              onValueChange={handleSliderChange}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>1</span>
              <span>현재: {item.currentSeats}</span>
            </div>
          </div>

          {isSimulating ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : simulation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-border/50 rounded-sm shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-xs">현재 비용</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatCurrency(simulation.currentMonthlyCost)}
                      <span className="text-muted-foreground text-xs font-normal">
                        /월
                      </span>
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-sm shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-xs">목표 비용</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatCurrency(simulation.targetMonthlyCost)}
                      <span className="text-muted-foreground text-xs font-normal">
                        /월
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-sm border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    절감 가능 금액
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                    {formatCurrency(simulation.monthlySavings)}/월 (
                    {formatCurrency(simulation.annualSavings)}/년)
                  </p>
                </CardContent>
              </Card>

              {simulation.affectedUsers.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">
                    영향받는 비활성 유저 ({simulation.affectedUsers.length}명)
                  </p>
                  <div className="max-h-32 overflow-y-auto rounded-md border">
                    <Table>
                      <TableBody>
                        {simulation.affectedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="py-1.5 text-sm">
                              {user.name ?? user.email}
                            </TableCell>
                            <TableCell className="py-1.5 text-right text-xs">
                              {user.email}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
