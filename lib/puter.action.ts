import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  upLoadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

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
  if (!PUTER_WORKER_URL) {
    console.warn("Misiing VITE_PUTER_WORKER_URL; skip history fetch");
    return null;
  }
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
  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };
  try {
    //Call the puter worker to store the project in KV
    //we call our backend worker
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/save`,
      {
        method: "POST",
        body: JSON.stringify({
          project: payload,
          visibility,
        }),
      },
    );
    if (!response.ok) {
      console.error("Failed to save the project again", await response.text());
      return null;
    }
    //if it saved it correctly we can extract the data and get 1 project and not an aray
    const data = (await response.json()) as { project?: DesignItem | null };
    //we return the data.project or if that doesn't exist then null

    return data?.project ?? null;
  } catch (e) {
    console.log("Failed to save project total", e);
    return null;
  }
};
//Lets get all the projects from Puter
export const getProjects = async () => {
  //if there is not "back-end" then console warn and return empty array
  if (!PUTER_WORKER_URL) {
    console.warn("Misiing VITE_PUTER_WORKER_URL; skip history fetch");
    return [];
  }
  //but if we do have the VITE_PUTER_WORKER_URL
  try {
    //we call our backend worker
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/list`,
      {
        method: "GET",
      },
    );
    //if the response is not ok
    if (!response.ok) {
      console.error("Failed to fetch history", await response.text());
      return [];
    }
    //if the repsonse is good, we can extract the data
    const data = (await response.json()) as { projects?: DesignItem[] | null };
    return Array.isArray(data?.projects) ? data?.projects : [];
  } catch (e) {
    console.error("Failed to get projects ", e);
    return [];
  }
};
//Lets get the project by id from Puter
export const getProjectById = async ({ id }: { id: string }) => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
    return null;
  }

  console.log("Fetching project with ID:", id);

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
      { method: "GET" },
    );

    console.log("Fetch project response:", response);

    if (!response.ok) {
      console.error("Failed to fetch project:", await response.text());
      return null;
    }

    const data = (await response.json()) as {
      project?: DesignItem | null;
    };

    console.log("Fetched project data:", data);

    return data?.project ?? null;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};
