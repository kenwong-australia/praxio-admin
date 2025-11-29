"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarIcon, FilterIcon, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toSydneyDateInput } from "@/lib/time";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import tz from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(tz);

export function FiltersBar({
  emails,
  onApply,
  defaultFrom,
  defaultTo,
}: {
  emails: string[];
  onApply: (email: string | null, fromISO: string, toISO: string) => void;
  defaultFrom: string;
  defaultTo: string;
}) {
  const [email, setEmail] = useState<string | null>(null);
  // Convert UTC ISO strings to Sydney dates for display (YYYY-MM-DD format for date input)
  const [from, setFrom] = useState(toSydneyDateInput(defaultFrom));
  const [to, setTo] = useState(toSydneyDateInput(defaultTo));

  function apply() {
    // Convert Sydney date (YYYY-MM-DD) to UTC ISO string
    // Interpret the date input as Sydney timezone start/end of day
    const fromISO = dayjs.tz(from + "T00:00:00", 'Australia/Sydney').utc().toISOString();
    const toISO = dayjs.tz(to + "T23:59:59", 'Australia/Sydney').utc().toISOString();
    onApply(email, fromISO, toISO);
  }

  function reset() {
    setEmail(null);
    const resetFrom = toSydneyDateInput(defaultFrom);
    const resetTo = toSydneyDateInput(defaultTo);
    setFrom(resetFrom);
    setTo(resetTo);
    const fromISO = dayjs.tz(resetFrom + "T00:00:00", 'Australia/Sydney').utc().toISOString();
    const toISO = dayjs.tz(resetTo + "T23:59:59", 'Australia/Sydney').utc().toISOString();
    onApply(null, fromISO, toISO);
  }

  return (
    <Card className="mb-8 bg-white border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="email-select" className="text-sm font-medium">
              User Email
            </Label>
            <Select value={email || "all"} onValueChange={(value) => setEmail(value === "all" ? null : value)}>
              <SelectTrigger id="email-select" className="w-full">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {emails.map((em) => (
                  <SelectItem key={em} value={em}>
                    {em}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from-date" className="text-sm font-medium flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              From Date
            </Label>
            <Input
              id="from-date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to-date" className="text-sm font-medium flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              To Date
            </Label>
            <Input
              id="to-date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={apply} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6">
              Apply Filters
            </Button>
            <Button onClick={reset} variant="outline" className="px-4">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}