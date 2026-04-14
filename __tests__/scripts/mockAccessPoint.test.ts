import { createMockAccessPointServer } from '../../scripts/mock-access-point';

describe('mock access point server', () => {
  const mockServer = createMockAccessPointServer({ port: 0 });
  const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };

  const loginOptions = (body: string) =>
    ({
      method: 'POST',
      headers: formHeaders,
      body,
      redirect: 'manual',
    }) as RequestInit;

  beforeAll(async () => {
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('authenticates /login and returns session cookie', async () => {
    const response = await fetch(
      `${mockServer.url}/login`,
      loginOptions('username=admin&password=bruce'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('BRUCESESSION=');
  });

  it('serves systeminfo and listfiles for authenticated sessions', async () => {
    const loginResponse = await fetch(
      `${mockServer.url}/login`,
      loginOptions('username=test&password=test'),
    );
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];

    const infoResponse = await fetch(`${mockServer.url}/systeminfo`, {
      headers: { Cookie: cookie ?? '' },
    });
    expect(infoResponse.status).toBe(200);
    const info = await infoResponse.json();
    expect(info.BRUCE_VERSION).toBe('mock-1.0.0');

    const listResponse = await fetch(`${mockServer.url}/listfiles?fs=SD&folder=%2F`, {
      headers: { Cookie: cookie ?? '' },
    });
    const listBody = await listResponse.text();
    expect(listResponse.status).toBe(200);
    expect(listBody).toContain('pa:/:0');
    expect(listBody).toContain('Fo:scripts:0');
    expect(listBody).toContain('Fi:README.txt:');
  });
});
