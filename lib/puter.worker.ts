declare const router: {
  get: (
    path: string,
    handler: (ctx: { request: Request; user: any }) => any,
  ) => void;
  post: (
    path: string,
    handler: (ctx: { request: Request; user: any }) => any,
  ) => void;
};

const PROJECT_PREFIX = "Layout3D_project_";

//jsonError function that recieves a status, message
const jsonError = (status: number, message: string, extra = {}) => {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
const getUserId = async (userPuter: any) => {
  try {
    const user = await userPuter.auth.getUser();
    return user?.uuid || null;
  } catch {
    return null;
  }
};
//define the worker routes that calls puters kv storage tpo save the project (like building a rest api)
router.post(
  "/api/projects/save",
  async ({ request, user }: { request: Request; user: any }) => {
    try {
      const userPuter = user.puter;
      //if we dont have the user
      if (!userPuter) return jsonError(401, "Authentication failed");
      //but if we do we can extract the body
      const body = await request.json();
      //then lets get the project
      const project = body?.project;

      //if we do not have a project with id and sourceimage throw an error
      if (!project.id || !project?.sourceimage)
        return jsonError(400, "Project not found");

      //But if we have a project id we can form a new payload with all current info about the project
      const payload = {
        ...project,
        updatedAt: new Date().toISOString(),
      };
      // then we can extract the user id by using the helper function getUserId
      const userId = await getUserId(userPuter);

      //if we dont get a userID
      if (!userId) return jsonError(401, "Authentication failed");
      // but if we do we can make the key
      const key = `${PROJECT_PREFIX}${project.id}`;
      //Once we have the key we can set it to the db
      await userPuter.kv.set(key, payload);
      //we can return it all to the front-end
      return { saved: true, id: project.id, project: payload };
    } catch (e) {
      return jsonError(500, "Failed to save the project worker", {
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  },
);

router.get("/api/projects/list", async ({ user }: { user: any }) => {
  try {
    const userPuter = user.puter;
    if (!userPuter) return jsonError(401, "Authentication failed");
    const keys = await userPuter.kv.list(`${PROJECT_PREFIX}*`);
    const projects = await Promise.all(
      keys.map((key: string) => userPuter.kv.get(key)),
    );
    return { projects };
  } catch (e) {
    return jsonError(500, "Failed to list projects", {
      message: e instanceof Error ? e.message : "Unknown error",
    });
  }
});

router.get(
  "/api/projects/get",
  async ({ request, user }: { request: Request; user: any }) => {
    try {
      const userPuter = user.puter;
      if (!userPuter) return jsonError(401, "Authentication failed");
      const id = new URL(request.url).searchParams.get("id");
      if (!id) return jsonError(400, "Missing project id");
      const project = await userPuter.kv.get(`${PROJECT_PREFIX}${id}`);
      if (!project) return jsonError(404, "Project not found");
      return { project };
    } catch (e) {
      return jsonError(500, "Failed to get project", {
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  },
);
