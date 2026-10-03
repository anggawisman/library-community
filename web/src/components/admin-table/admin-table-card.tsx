"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AdminTableFilter = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function AdminTableCard({
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  actions,
  children,
}: {
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: AdminTableFilter[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const showSearch = Boolean(onSearchChange);

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{title}</CardTitle>
        <CardDescription className="max-w-lg leading-snug">{description}</CardDescription>
        {showSearch || actions ? (
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            {showSearch ? (
              <InputGroup className="h-7 w-full md:w-64">
                <InputGroupAddon align="inline-start">
                  <Search className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput
                  className="h-7"
                  placeholder={searchPlaceholder ?? "Search…"}
                  value={searchValue ?? ""}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                />
              </InputGroup>
            ) : null}
            {actions}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        {filters && filters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 px-4">
            {filters.map((filter) => (
              <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">{filter.label}:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filter.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ))}
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
