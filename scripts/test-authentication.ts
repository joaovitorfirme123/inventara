import "dotenv/config";

const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const password = process.env.SEED_USER_PASSWORD;

if (!password) {
  throw new Error("SEED_USER_PASSWORD is required for the authentication test.");
}

async function expectStatus(
  label: string,
  request: Promise<Response>,
  expectedStatus: number,
) {
  const response = await request;

  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, received ${response.status}.`);
  }

  return response;
}

function getCookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function testAuthentication() {
  await expectStatus(
    "Protected page without session",
    fetch(`${baseUrl}/produtos`, { redirect: "manual" }),
    307,
  );
  await expectStatus(
    "Protected API without session",
    fetch(`${baseUrl}/api/importacoes`, { method: "POST" }),
    401,
  );
  await expectStatus(
    "Invalid credentials",
    fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: "ana@alfa.test", password: "invalid-password" }),
    }),
    401,
  );

  const login = await expectStatus(
    "Valid credentials",
    fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: "ana@alfa.test", password }),
    }),
    200,
  );
  const cookie = getCookieHeader(login);

  if (!cookie) throw new Error("Login did not issue a session cookie.");

  const protectedPage = await expectStatus(
    "Protected page with session",
    fetch(`${baseUrl}/produtos`, { headers: { cookie } }),
    200,
  );

  if (!(await protectedPage.text()).includes("Organização Alfa")) {
    throw new Error("Authenticated page did not use the user's organization.");
  }

  await expectStatus(
    "Logout",
    fetch(`${baseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie, origin: baseUrl },
      body: "{}",
    }),
    200,
  );
  await expectStatus(
    "Protected page after logout",
    fetch(`${baseUrl}/produtos`, { headers: { cookie }, redirect: "manual" }),
    307,
  );

  console.log("Login, session, route protection, and logout checks passed.");
}

testAuthentication().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
