"use client";

import { useConfiguration } from "@/components/configuration-provider";
import { SettingRow } from "@/components/settings/setting-row";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

export function LayoutSettings() {
  const { appearance, updateAppearance, writable } = useConfiguration();
  return (
    <>
      <SettingRow id="layout.primaryColumn">
        <Select
          value={appearance.primaryColumn}
          disabled={!writable}
          onValueChange={(value) => {
            if (value === "left" || value === "right")
              void updateAppearance({ primaryColumn: value });
          }}
        >
          <SelectTrigger aria-labelledby="layout.primaryColumn-label" className="w-56">
            <SelectValue>
              {appearance.primaryColumn === "left"
                ? "Left pane is primary"
                : "Right pane is primary"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left pane is primary</SelectItem>
            <SelectItem value="right">Right pane is primary</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow id="layout.primaryRow">
        <Select
          value={appearance.primaryRow}
          disabled={!writable}
          onValueChange={(value) => {
            if (value === "top" || value === "bottom") void updateAppearance({ primaryRow: value });
          }}
        >
          <SelectTrigger aria-labelledby="layout.primaryRow-label" className="w-56">
            <SelectValue>
              {appearance.primaryRow === "top" ? "Top pane is primary" : "Bottom pane is primary"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top pane is primary</SelectItem>
            <SelectItem value="bottom">Bottom pane is primary</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </>
  );
}
export function NotificationSettings() {
  const { appearance, updateAppearance, writable } = useConfiguration();
  return (
    <SettingRow id="notifications.duration">
      <Select
        value={String(appearance.notificationDuration)}
        disabled={!writable}
        onValueChange={(value) => {
          if (value && ["0", "3000", "5000", "8000"].includes(value))
            void updateAppearance({ notificationDuration: Number(value) });
        }}
      >
        <SelectTrigger aria-labelledby="notifications.duration-label" className="w-56">
          <SelectValue>
            {appearance.notificationDuration === 0
              ? "Until dismissed"
              : `${appearance.notificationDuration / 1000} seconds`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[
            ["3000", "3 seconds"],
            ["5000", "5 seconds"],
            ["8000", "8 seconds"],
            ["0", "Until dismissed"],
          ].map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() =>
          toast.add({
            title: "Notification preview",
            description:
              "Warnings and confirmations use your selected duration. Errors stay until dismissed.",
            type: "info",
          })
        }
      >
        Preview notification
      </Button>
    </SettingRow>
  );
}
