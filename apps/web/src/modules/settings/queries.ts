import "server-only";
import { settings } from "@ecclesia/db/repositories";
import { readChurch } from "@/server/queries";

export const loadGeneralSettings = async () =>
  readChurch("settings.manage", async ({ tx, accessLevel }) => ({
    church: await settings.getChurch(tx),
    readOnly: accessLevel !== "full",
  }));

export const loadServiceTypes = async () =>
  readChurch("settings.manage", async ({ tx, accessLevel }) => ({
    serviceTypes: await settings.listAllServiceTypes(tx),
    readOnly: accessLevel !== "full",
  }));

export const loadCategories = async () =>
  readChurch("settings.manage", async ({ tx, accessLevel }) => ({
    categories: await settings.listAllCategories(tx),
    readOnly: accessLevel !== "full",
  }));
