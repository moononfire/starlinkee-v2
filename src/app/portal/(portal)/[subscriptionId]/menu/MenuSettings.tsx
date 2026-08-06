"use client";

import { useState } from "react";
import type { CustomerLocation } from "@/lib/types";
import { t } from "@/lib/translations";
import SavableForm from "../../SavableForm";
import SubmitButton from "../../SubmitButton";
import { updateMenuSettingsAction } from "./actions";
import { AutoSaveToggle, AutoSavePendingHint } from "../../settings/AutoSaveControls";

export default function MenuSettings({
  subscriptionId,
  location,
  lang,
}: {
  subscriptionId: number;
  location: CustomerLocation;
  lang: string;
}) {
  const [menuType, setMenuType] = useState<"link" | "image">(location.menu_type || "link");

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t("portal_menu_title", lang)}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t("portal_menu_desc", lang)}
        </p>

        <SavableForm
          action={updateMenuSettingsAction}
          className="space-y-4"
          lang={lang}
        >
          <input type="hidden" name="location_id" value={location.location_id} />
          
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <AutoSaveToggle
              name="has_menu_enabled"
              defaultChecked={location.has_menu_enabled}
              ariaLabel="Menu Enabled"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Włącz moduł Menu / Enable Menu sharing
            </span>
          </label>
          <AutoSavePendingHint lang={lang} />

          <div className="flex flex-col gap-4 max-w-sm border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="menu_type"
                    value="link"
                    checked={menuType === "link"}
                    onChange={() => setMenuType("link")}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("portal_menu_type_link", lang)}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="menu_type"
                    value="image"
                    checked={menuType === "image"}
                    onChange={() => setMenuType("image")}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("portal_menu_type_image", lang)}</span>
                </label>
              </div>
            </div>

            {menuType === "link" && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("portal_menu_link_url", lang)}
                </label>
                <input
                  name="menu_link"
                  type="url"
                  defaultValue={location.menu_link || ""}
                  placeholder="https://example.com/menu"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {menuType === "image" && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t("portal_menu_image", lang)}
                </label>
                {location.menu_image_url && (
                  <div className="mb-2">
                    <img src={location.menu_image_url} alt="Menu" className="max-w-full h-auto rounded border" style={{ maxHeight: 150 }} />
                    <input type="hidden" name="menu_image_url" value={location.menu_image_url} />
                  </div>
                )}
                <input
                  name="menu_image_file"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">{t("portal_menu_image_help", lang)}</p>
              </div>
            )}

            <div className="pt-2">
              <SubmitButton lang={lang}>{t("portal_wifi_save", lang)}</SubmitButton>
            </div>
          </div>
        </SavableForm>
      </section>
    </div>
  );
}
