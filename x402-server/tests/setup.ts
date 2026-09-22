import { beforeAll, afterAll, afterEach } from 'vitest';
import app from '../src/index';

let server: any;

beforeAll(() => {
  server = app.listen(3002);
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  // Clear mocks and resets
});
