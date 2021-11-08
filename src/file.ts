import { writeFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";

let connections = 0;
const path = resolve(homedir(), ".ghost-text");

const save = async () => {
  await writeFile(path, `${connections}`);
};

save();

export const addConnection = async () => {
  connections += 1;
  await save();
};

export const removeConnection = async () => {
  connections -= 1;
  await save();
};
