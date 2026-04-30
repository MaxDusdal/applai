import { getProfile } from "./get-profile";
import { listApplications } from "./list-applications";
import { getApplication } from "./get-application";
import { getWorkspace } from "./get-workspace";
import { getDocument } from "./get-document";
import { updateProfile } from "./update-profile";
import { patchProfile } from "./patch-profile";
import { updateApplication } from "./update-application";
import { updateDocument } from "./update-document";
import { patchDocument } from "./patch-document";
import { createApplication } from "./create-application";
import { listDocumentVersions } from "./list-document-versions";
import { restoreDocumentVersion } from "./restore-document-version";

export const allTools = [
  getProfile,
  listApplications,
  getApplication,
  getWorkspace,
  getDocument,
  updateProfile,
  patchProfile,
  updateApplication,
  updateDocument,
  patchDocument,
  createApplication,
  listDocumentVersions,
  restoreDocumentVersion,
] as const;
