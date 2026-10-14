import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

export async function runPythonEngine(args: string[]): Promise<any> {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(stdout);
}

export async function runPythonEngineWithEnv(args: string[], envVars: Record<string, string> = {}): Promise<any> {
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.resolve(process.cwd(), 'python', 'finance_engine.py');
  const env = { ...process.env, ...envVars, PYTHONIOENCODING: 'utf-8' };
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, ...args], {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    env
  });
  return JSON.parse(stdout);
}