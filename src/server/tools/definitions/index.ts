import { getProfile } from "./get-profile";
import { listApplications } from "./list-applications";
import { getApplication } from "./get-application";
import { getDocument } from "./get-document";
import { updateProfile } from "./update-profile";
import { patchProfile } from "./patch-profile";
import { updateApplication } from "./update-application";
import { updateDocument } from "./update-document";
import { patchDocument } from "./patch-document";
import { createApplication } from "./create-application";

export const allTools = [
  getProfile,
  listApplications,
  getApplication,
  getDocument,
  updateProfile,
  patchProfile,
  updateApplication,
  updateDocument,
  patchDocument,
  createApplication,
] as const;
