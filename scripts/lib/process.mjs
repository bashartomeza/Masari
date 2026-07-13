import { spawnSync } from "node:child_process";

export function executable(name) {
  if (process.platform !== "win32") return name;
  if (name === "npm") return "npm.cmd";
  if (name === "flutter") return "flutter.bat";
  if (name === "dart") return "dart.bat";
  return name;
}

export function run(command, args = [], options = {}) {
  let file = executable(command);
  let commandArgs = args;
  if (process.platform === "win32" && command === "npm" && process.env.npm_execpath) {
    file = process.execPath;
    commandArgs = [process.env.npm_execpath, ...args];
  }
  const useShell = process.platform === "win32" && /\.(?:cmd|bat)$/i.test(file);
  const result = spawnSync(file, commandArgs, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: options.encoding,
    stdio: options.stdio ?? "inherit",
    input: options.input,
    shell: useShell
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
  return result;
}
