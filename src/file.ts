import { writeFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";

let connections = 0;
const path = resolve(homedir(), ".ghost-text");

const save = async () => {
  await writeFile(path, `${connections}`);
};

save();

export const addConnection = () => {
  connections += 1;
  save();
};

export const removeConnection = () => {
  connections -= 1;
  save();
};
