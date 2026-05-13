import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  upLoadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";

//Puter action for signing in user
export const signIn = async () => await puter.auth.signIn();

//Puter action for signing out user
export const signOut = () => puter.auth.signOut();

//Puter action for getting out user
export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};
//Create a new project
export const createProject = async ({
  item,
  visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  const projectId = item.id;
  const hosting = await getOrCreateHostingConfig();
  const hostedSource = projectId
    ? await upLoadImageToHosting({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;
  const hostedRender =
    projectId && item.renderedImage
      ? await upLoadImageToHosting({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        })
      : null;
  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn("Failed to host source image, skipping save");
    return null;
  }
  const resolvedRender = hostedRender?.url
    ? hostedRender.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;
  //Fit it into the designItem interface, destructure
  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  //Make a payload to send to puter
  const payLoad = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };
  try {
    //Call the puter worker to store the project in KV
    return payLoad;
  } catch (e) {
    console.log("Failed to save project", e);
    return null;
  }
};
